// Passkey (pedido do dono em 15/11): entrar com a digital, o rosto ou o PIN do celular. Segue os
// guias security/passkey-registration e passkey-authentication da skill modern-web-guidance:
// credencial "descobrível" (sem digitar o e-mail), verificação do usuário "preferida", desafio
// guardado no servidor (Redis, 5 min, uso único) e 404 para credencial desconhecida (o navegador
// avisa o gerenciador de senhas). A criptografia é da @simplewebauthn/server.
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  criarPasskeySchema,
  entrarComPasskeySchema,
  MAXIMO_PASSKEYS,
  nomeDaPasskey,
  renomearPasskeySchema,
  VALIDADE_DESAFIO_PASSKEY,
  type CriarPasskeyEntrada,
  type EntrarComPasskeyEntrada,
  type OpcoesPasskey,
  type PasskeyNaTela,
  type Sessao,
} from '@pente-fino/shared';
import type { Transacao } from '@pente-fino/db';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import type { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { BancoService } from '../comum/banco.service.js';
import { Contexto } from '../comum/contexto.js';
import { ErroApp, Erros } from '../comum/erros.js';
import { Corpo } from '../comum/validacao.js';
import { CONFIGURACAO, type Configuracao } from '../config/configuracao.js';
import { REDIS } from '../filas/filas.module.js';
import { AuthService } from './auth.service.js';
import { LimiteAutenticacao, LivreSemAssinatura, Publico } from './decoradores.js';

const NOME_DO_SISTEMA = 'Pente Fino';

const naoReconhecida = () =>
  new ErroApp(
    HttpStatus.NOT_FOUND,
    'passkey_desconhecida',
    'Esta passkey não está mais cadastrada. Entre com e-mail e senha e crie outra no Perfil.',
  );
const naoConferiu = () =>
  new ErroApp(
    HttpStatus.UNAUTHORIZED,
    'passkey_invalida',
    'Não deu para confirmar a passkey. Tente de novo ou entre com e-mail e senha.',
  );
const desafioVencido = () =>
  new ErroApp(
    HttpStatus.BAD_REQUEST,
    'desafio_vencido',
    'Demorou demais para confirmar. Tente de novo.',
  );

const naTela = (p: {
  id: string;
  nome: string;
  dispositivo: string;
  criadoEm: Date;
  usadoEm: Date | null;
}): PasskeyNaTela => ({
  id: p.id,
  nome: p.nome,
  sincronizada: p.dispositivo === 'multiDevice',
  criadaEm: p.criadoEm.toISOString(),
  usadaEm: p.usadoEm?.toISOString() ?? null,
});

@Injectable()
export class PasskeysService {
  private readonly logger = new Logger(PasskeysService.name);

  constructor(
    @Inject(BancoService) private readonly banco: BancoService,
    @Inject(CONFIGURACAO) private readonly config: Configuracao,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  private async conectar() {
    if (this.redis.status === 'wait') await this.redis.connect();
  }

  /** Guarda o desafio por 5 min; `dono` amarra o de cadastro ao usuário que pediu. */
  private async guardarDesafio(desafio: string, dono: string): Promise<string> {
    await this.conectar();
    const id = randomUUID();
    await this.redis.set(
      `passkey:desafio:${id}`,
      JSON.stringify({ desafio, dono }),
      'EX',
      VALIDADE_DESAFIO_PASSKEY,
    );
    return id;
  }

  /** Lê e apaga (uso único). */
  private async usarDesafio(id: string, dono: string): Promise<string> {
    await this.conectar();
    const bruto = await this.redis.getdel(`passkey:desafio:${id}`);
    if (!bruto) throw desafioVencido();
    const d = JSON.parse(bruto) as { desafio: string; dono: string };
    if (d.dono !== dono) throw desafioVencido();
    return d.desafio;
  }

  // ─── Entrar ──────────────────────────────────────────────────────────────

  async opcoesDeEntrada(): Promise<OpcoesPasskey> {
    const opcoes = await generateAuthenticationOptions({
      rpID: this.config.passkey.rpId,
      // Vazio: o gerenciador mostra as passkeys da pessoa, sem digitar o e-mail.
      allowCredentials: [],
      userVerification: 'preferred',
    });
    return {
      desafioId: await this.guardarDesafio(opcoes.challenge, 'entrar'),
      opcoes: opcoes as unknown as Record<string, unknown>,
    };
  }

  async entrar({ desafioId, resposta }: EntrarComPasskeyEntrada): Promise<Sessao> {
    const desafio = await this.usarDesafio(desafioId, 'entrar');
    const credencialId = resposta.id;
    const passkey = await this.banco.semConta({ passkeyCredencial: credencialId }, (tx) =>
      tx.passkey.findUnique({ where: { credencialId } }),
    );
    if (!passkey) throw naoReconhecida();

    return this.banco.naConta(passkey.contaId, async (tx) => {
      const usuario = await tx.usuario.findUnique({ where: { id: passkey.usuarioId } });
      if (!usuario?.ativo) throw naoConferiu();
      const conta = await tx.conta.findUniqueOrThrow({ where: { id: passkey.contaId } });
      if (conta.status === 'suspensa' || conta.status === 'cancelada')
        throw Erros.semPermissao('Esta conta está suspensa. Fale com o suporte do Pente Fino.');
      let conferida;
      try {
        conferida = await verifyAuthenticationResponse({
          response: resposta as unknown as AuthenticationResponseJSON,
          expectedChallenge: desafio,
          expectedOrigin: this.config.passkey.origens,
          expectedRPID: this.config.passkey.rpId,
          credential: {
            id: passkey.credencialId,
            publicKey: new Uint8Array(passkey.chavePublica),
            counter: passkey.contador,
            transports: passkey.transportes,
          },
          // "preferred": aceita o aparelho sem bloqueio de tela (guia passkey-authentication).
          requireUserVerification: false,
        });
      } catch (e) {
        this.logger.warn(`Passkey recusada: ${(e as Error).message}`);
        throw naoConferiu();
      }
      if (!conferida.verified) throw naoConferiu();
      await tx.passkey.update({
        where: { id: passkey.id },
        data: { contador: conferida.authenticationInfo.newCounter, usadoEm: new Date() },
      });
      return this.auth.montarSessao(tx, usuario.id);
    });
  }

  // ─── Minhas passkeys ─────────────────────────────────────────────────────

  private semSuporte() {
    const u = Contexto.usuario();
    if (u.suporte) throw Erros.semPermissao('No modo suporte não dá para mexer nas passkeys.');
    return u;
  }

  async listar(): Promise<PasskeyNaTela[]> {
    const { id } = Contexto.usuario();
    const lista = await this.banco.daConta((tx) =>
      tx.passkey.findMany({ where: { usuarioId: id }, orderBy: { criadoEm: 'desc' } }),
    );
    return lista.map(naTela);
  }

  async opcoesDeCadastro(): Promise<OpcoesPasskey> {
    const u = this.semSuporte();
    const { usuario, existentes } = await this.banco.daConta(async (tx: Transacao) => ({
      usuario: await tx.usuario.findUniqueOrThrow({ where: { id: u.id } }),
      existentes: await tx.passkey.findMany({ where: { usuarioId: u.id } }),
    }));
    if (existentes.length >= MAXIMO_PASSKEYS)
      throw Erros.conflito(`Dá para ter até ${MAXIMO_PASSKEYS} passkeys. Apague uma antes.`);
    const opcoes = await generateRegistrationOptions({
      rpName: NOME_DO_SISTEMA,
      rpID: this.config.passkey.rpId,
      userName: usuario.email,
      userDisplayName: usuario.nome,
      userID: new TextEncoder().encode(usuario.id),
      attestationType: 'none',
      // Evita duas passkeys no mesmo gerenciador.
      excludeCredentials: existentes.map((p) => ({
        id: p.credencialId,
        transports: p.transportes,
      })),
      authenticatorSelection: {
        residentKey: 'required',
        requireResidentKey: true,
        userVerification: 'preferred',
      },
    });
    return {
      desafioId: await this.guardarDesafio(opcoes.challenge, u.id),
      opcoes: opcoes as unknown as Record<string, unknown>,
    };
  }

  async criar(desafioId: string, { resposta }: CriarPasskeyEntrada): Promise<PasskeyNaTela> {
    const u = this.semSuporte();
    const desafio = await this.usarDesafio(desafioId, u.id);
    let conferida;
    try {
      conferida = await verifyRegistrationResponse({
        response: resposta as unknown as RegistrationResponseJSON,
        expectedChallenge: desafio,
        expectedOrigin: this.config.passkey.origens,
        expectedRPID: this.config.passkey.rpId,
        requireUserVerification: false,
      });
    } catch (e) {
      this.logger.warn(`Cadastro de passkey recusado: ${(e as Error).message}`);
      throw naoConferiu();
    }
    if (!conferida.verified) throw naoConferiu();
    const info = conferida.registrationInfo;
    const criada = await this.banco.daConta((tx) =>
      tx.passkey.create({
        data: {
          usuarioId: u.id,
          credencialId: info.credential.id,
          chavePublica: Buffer.from(info.credential.publicKey),
          contador: info.credential.counter,
          transportes: info.credential.transports ?? [],
          dispositivo: info.credentialDeviceType,
          comBackup: info.credentialBackedUp,
          aaguid: info.aaguid,
          nome: nomeDaPasskey(info.aaguid),
        },
      }),
    );
    return naTela(criada);
  }

  async renomear(id: string, nome: string): Promise<PasskeyNaTela> {
    const u = this.semSuporte();
    return this.banco.daConta(async (tx) => {
      const p = await tx.passkey.findFirst({ where: { id, usuarioId: u.id } });
      if (!p) throw Erros.naoEncontrado('Passkey não encontrada.');
      return naTela(await tx.passkey.update({ where: { id }, data: { nome } }));
    });
  }

  async apagar(id: string): Promise<void> {
    const u = this.semSuporte();
    const apagadas = await this.banco.daConta((tx) =>
      tx.passkey.deleteMany({ where: { id, usuarioId: u.id } }),
    );
    if (!apagadas.count) throw Erros.naoEncontrado('Passkey não encontrada.');
  }
}

@ApiTags('Autenticação')
@LivreSemAssinatura()
@Controller('auth/passkey')
export class PasskeyEntrarController {
  constructor(@Inject(PasskeysService) private readonly passkeys: PasskeysService) {}

  // Sem o limite de login: a tela de entrar pede um desafio a cada abertura (sugestão no campo);
  // o desafio é barato e some em 5 min. O limite vale no "entrar", que confere a assinatura.
  @Post('opcoes')
  @Publico()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desafio para entrar com passkey (sem digitar o e-mail)' })
  opcoes(): Promise<OpcoesPasskey> {
    return this.passkeys.opcoesDeEntrada();
  }

  @Post('entrar')
  @Publico()
  @LimiteAutenticacao()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Entrar com a passkey; 404 se a credencial não existe mais' })
  entrar(@Corpo(entrarComPasskeySchema) dados: EntrarComPasskeyEntrada): Promise<Sessao> {
    return this.passkeys.entrar(dados);
  }
}

@ApiTags('Autenticação')
@ApiBearerAuth()
@LivreSemAssinatura()
@Controller('me/passkeys')
export class MinhasPasskeysController {
  constructor(@Inject(PasskeysService) private readonly passkeys: PasskeysService) {}

  @Get()
  @ApiOperation({ summary: 'Minhas passkeys' })
  listar(): Promise<PasskeyNaTela[]> {
    return this.passkeys.listar();
  }

  @Post('opcoes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desafio para criar uma passkey' })
  opcoes(): Promise<OpcoesPasskey> {
    return this.passkeys.opcoesDeCadastro();
  }

  @Post(':desafioId')
  @ApiOperation({ summary: 'Guardar a passkey criada no aparelho' })
  criar(
    @Param('desafioId', ParseUUIDPipe) desafioId: string,
    @Corpo(criarPasskeySchema) dados: CriarPasskeyEntrada,
  ): Promise<PasskeyNaTela> {
    return this.passkeys.criar(desafioId, dados);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Renomear uma passkey' })
  renomear(
    @Param('id', ParseUUIDPipe) id: string,
    @Corpo(renomearPasskeySchema) { nome }: { nome: string },
  ): Promise<PasskeyNaTela> {
    return this.passkeys.renomear(id, nome);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Apagar uma passkey' })
  apagar(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.passkeys.apagar(id);
  }
}
