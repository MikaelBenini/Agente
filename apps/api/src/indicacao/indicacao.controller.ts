// Indique e ganhe (regras do dono em 14/11). Qualquer pessoa se cadastra como indicador e ganha um
// link; o dono que já é cliente faz o mesmo pela conta e pode trocar o Pix por meses grátis. O
// gatilho na fatura cria as comissões; aqui ficam o cadastro, os painéis e a tela da
// administração, que paga o Pix do mês e marca os meses grátis aplicados.
import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Injectable,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  cadastroIndicadorSchema,
  codigoIndicacaoSchema,
  gerarCodigoIndicacao,
  indicacaoDaContaSchema,
  resumoDoIndicador,
  type CadastroIndicadorEntrada,
  type ComissaoIndicacao,
  type IndicacaoDaContaEntrada,
  type IndicadorNaAdmin,
  type PainelIndicador,
} from '@pente-fino/shared';
import { AdminGuard, PapeisPlataforma } from '../admin/admin.guard.js';
import { BancoPlataforma } from '../admin/banco-plataforma.js';
import { gerarTokenOpaco, hashToken } from '../auth/tokens.js';
import { LimiteAutenticacao, Papeis, Publico } from '../auth/decoradores.js';
import { BancoService } from '../comum/banco.service.js';
import { Contexto } from '../comum/contexto.js';
import { Erros } from '../comum/erros.js';
import { Corpo } from '../comum/validacao.js';
import { CONFIGURACAO, type Configuracao } from '../config/configuracao.js';

type LinhaComissao = {
  id: string;
  tipo: string;
  valor: number;
  liberaEm: Date;
  pagaEm: Date | null;
  canceladaEm: Date | null;
  aplicadaEm: Date | null;
};

const comissaoNaTela = (c: LinhaComissao): ComissaoIndicacao => ({
  id: c.id,
  tipo: c.tipo === 'mes' ? 'mes' : 'pix',
  valor: c.valor,
  liberaEm: c.liberaEm.toISOString(),
  pagaEm: c.pagaEm?.toISOString() ?? null,
  canceladaEm: c.canceladaEm?.toISOString() ?? null,
  aplicadaEm: c.aplicadaEm?.toISOString() ?? null,
});

@Injectable()
export class IndicacaoService {
  constructor(
    @Inject(BancoPlataforma) private readonly plataforma: BancoPlataforma,
    @Inject(BancoService) private readonly banco: BancoService,
    @Inject(CONFIGURACAO) private readonly config: Configuracao,
  ) {}

  link(codigo: string): string {
    return `${this.config.appUrl}/cadastro?indicacao=${codigo}`;
  }

  /** Um código que ainda não existe. */
  private async codigoNovo(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const c = gerarCodigoIndicacao();
      if (!(await this.plataforma.prisma.indicador.findUnique({ where: { codigo: c } }))) return c;
    }
    throw Erros.indisponivel('Não deu para gerar o código agora. Tente de novo.');
  }

  /** O código existe e está ativo? (o cadastro da barbearia indicada usa) */
  async codigoValido(codigo: string | undefined | null): Promise<string | null> {
    const r = codigoIndicacaoSchema.safeParse(codigo ?? '');
    if (!r.success) return null;
    const i = await this.plataforma.prisma.indicador.findUnique({ where: { codigo: r.data } });
    return i?.ativo ? i.codigo : null;
  }

  async painel(indicadorId: string): Promise<PainelIndicador> {
    const p = this.plataforma.prisma;
    const i = await p.indicador.findUniqueOrThrow({
      where: { id: indicadorId },
      include: { comissoes: { orderBy: { criadoEm: 'desc' } } },
    });
    const [contagem] = await p.$queryRaw<{ em_teste: number; pagantes: number }[]>`
      SELECT * FROM indicadas_do_codigo(${i.codigo})`;
    const comissoes = i.comissoes.map(comissaoNaTela);
    return {
      nome: i.nome,
      codigo: i.codigo,
      recebe: i.recebe === 'meses' ? 'meses' : 'pix',
      indicadas: { emTeste: contagem?.em_teste ?? 0, pagantes: contagem?.pagantes ?? 0 },
      resumo: resumoDoIndicador(comissoes, new Date()),
      comissoes,
    };
  }

  /** Cadastro de quem indica sem ser cliente: devolve o link e o acesso ao painel (uma vez só). */
  async cadastrar(
    d: CadastroIndicadorEntrada,
  ): Promise<{ codigo: string; link: string; token: string }> {
    const ja = await this.plataforma.prisma.indicador.findUnique({ where: { email: d.email } });
    if (ja)
      throw Erros.conflito(
        'Este e-mail já tem um link de indicação. Use o link do painel que você guardou.',
      );
    const token = gerarTokenOpaco();
    const codigo = await this.codigoNovo();
    await this.plataforma.prisma.indicador.create({
      data: { ...d, codigo, tokenHash: hashToken(token), recebe: 'pix' },
    });
    return { codigo, link: this.link(codigo), token };
  }

  async painelPeloToken(token: string | undefined): Promise<PainelIndicador> {
    const i = token
      ? await this.plataforma.prisma.indicador.findUnique({
          where: { tokenHash: hashToken(token) },
        })
      : null;
    if (!i) throw Erros.naoEncontrado('Link do painel inválido.');
    return this.painel(i.id);
  }

  /** Dono que já é cliente: o indicador da conta (ou null se ainda não entrou no programa). */
  async daConta(): Promise<(PainelIndicador & { link: string }) | null> {
    const i = await this.plataforma.prisma.indicador.findUnique({
      where: { contaId: Contexto.usuario().contaId },
    });
    if (!i) return null;
    return { ...(await this.painel(i.id)), link: this.link(i.codigo) };
  }

  async entrarPelaConta(d: IndicacaoDaContaEntrada): Promise<PainelIndicador & { link: string }> {
    const quem = Contexto.usuario();
    const usuario = await this.banco.daConta((tx) =>
      tx.usuario.findUniqueOrThrow({ where: { id: quem.id }, select: { nome: true, email: true } }),
    );
    const dados =
      d.recebe === 'pix'
        ? { recebe: 'pix', cpf: d.cpf, chavePix: d.chavePix }
        : { recebe: 'meses' };
    const atual = await this.plataforma.prisma.indicador.findUnique({
      where: { contaId: quem.contaId },
    });
    if (atual)
      await this.plataforma.prisma.indicador.update({ where: { id: atual.id }, data: dados });
    else {
      const outro = await this.plataforma.prisma.indicador.findUnique({
        where: { email: usuario.email },
      });
      if (outro && !outro.contaId)
        // Já era indicador pelo site com o mesmo e-mail: passa a ser o da conta.
        await this.plataforma.prisma.indicador.update({
          where: { id: outro.id },
          data: { ...dados, contaId: quem.contaId },
        });
      else
        await this.plataforma.prisma.indicador.create({
          data: {
            nome: usuario.nome,
            email: usuario.email,
            codigo: await this.codigoNovo(),
            tokenHash: hashToken(gerarTokenOpaco()),
            contaId: quem.contaId,
            ...dados,
          },
        });
    }
    return (await this.daConta())!;
  }

  async paraAdmin(): Promise<IndicadorNaAdmin[]> {
    const p = this.plataforma.prisma;
    const lista = await p.indicador.findMany({
      include: { comissoes: true },
      orderBy: { criadoEm: 'desc' },
    });
    const agora = new Date();
    return lista.map((i) => ({
      id: i.id,
      nome: i.nome,
      email: i.email,
      cpf: i.cpf,
      chavePix: i.chavePix,
      codigo: i.codigo,
      recebe: i.recebe === 'meses' ? 'meses' : 'pix',
      cliente: !!i.contaId,
      indicadas: new Set(i.comissoes.map((c) => c.contaId)).size,
      resumo: resumoDoIndicador(i.comissoes.map(comissaoNaTela), agora),
    }));
  }

  /** O Pix do mês: marca como pago tudo o que já liberou (a partir do mínimo). */
  async pagar(indicadorId: string): Promise<{ total: number }> {
    const p = this.plataforma.prisma;
    const agora = new Date();
    const liberadas = await p.comissaoIndicacao.findMany({
      where: {
        indicadorId,
        tipo: 'pix',
        pagaEm: null,
        canceladaEm: null,
        liberaEm: { lte: agora },
      },
    });
    const total = liberadas.reduce((s, c) => s + c.valor, 0);
    if (total < 5000) throw Erros.conflito('O Pix só sai a partir de R$ 50,00 liberados.');
    await p.comissaoIndicacao.updateMany({
      where: { id: { in: liberadas.map((c) => c.id) } },
      data: { pagaEm: agora },
    });
    return { total };
  }

  async aplicarMes(comissaoId: string): Promise<void> {
    const r = await this.plataforma.prisma.comissaoIndicacao.updateMany({
      where: { id: comissaoId, tipo: 'mes', aplicadaEm: null, canceladaEm: null },
      data: { aplicadaEm: new Date() },
    });
    if (r.count === 0) throw Erros.naoEncontrado('Mês grátis não encontrado ou já aplicado.');
  }
}

@ApiTags('Site')
@Controller('publico/indicadores')
@Publico()
export class IndicacaoPublicoController {
  constructor(@Inject(IndicacaoService) private readonly servico: IndicacaoService) {}

  @Post()
  @LimiteAutenticacao()
  @ApiOperation({ summary: 'Indique e ganhe: cadastro de quem indica (qualquer pessoa)' })
  cadastrar(@Corpo(cadastroIndicadorSchema) d: CadastroIndicadorEntrada) {
    return this.servico.cadastrar(d);
  }

  @Get('painel')
  @ApiOperation({ summary: 'Painel de quem indica (pelo link secreto, no cabeçalho)' })
  painel(@Headers('x-indicador-token') token?: string): Promise<PainelIndicador> {
    return this.servico.painelPeloToken(token);
  }

  @Get('codigo/:codigo')
  @ApiOperation({ summary: 'O código do link de indicação vale? (cadastro da barbearia)' })
  async codigo(@Param('codigo') codigo: string): Promise<{ valido: boolean }> {
    return { valido: !!(await this.servico.codigoValido(codigo)) };
  }
}

@ApiTags('Conta')
@ApiBearerAuth()
@Controller('conta/indicacao')
export class IndicacaoContaController {
  constructor(@Inject(IndicacaoService) private readonly servico: IndicacaoService) {}

  @Get()
  @Papeis('dono')
  @ApiOperation({ summary: 'Indique e ganhe do dono: link, indicadas e comissões' })
  ler() {
    return this.servico.daConta();
  }

  @Put()
  @Papeis('dono')
  @ApiOperation({ summary: 'Entrar no indique e ganhe ou trocar Pix e meses grátis' })
  entrar(@Corpo(indicacaoDaContaSchema) d: IndicacaoDaContaEntrada) {
    return this.servico.entrarPelaConta(d);
  }
}

@ApiTags('Administração do sistema')
@ApiBearerAuth()
@Controller('admin/indicacoes')
@Publico()
@UseGuards(AdminGuard)
export class AdminIndicacaoController {
  constructor(@Inject(IndicacaoService) private readonly servico: IndicacaoService) {}

  @Get()
  @PapeisPlataforma('admin', 'financeiro')
  @ApiOperation({ summary: 'Quem indica: Pix a pagar e meses grátis a aplicar' })
  lista(): Promise<IndicadorNaAdmin[]> {
    return this.servico.paraAdmin();
  }

  @Post(':id/pagar')
  @PapeisPlataforma('admin', 'financeiro')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar o Pix do mês como pago (o que já liberou)' })
  pagar(@Param('id', ParseUUIDPipe) id: string) {
    return this.servico.pagar(id);
  }

  @Post('comissoes/:id/aplicar')
  @PapeisPlataforma('admin', 'financeiro')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marcar o mês grátis como aplicado na assinatura' })
  aplicar(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.servico.aplicarMes(id);
  }
}
