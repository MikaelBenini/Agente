// Depoimentos da página de vendas (pedido do dono em 14/11). A administração cadastra pelo link do
// Instagram: o servidor tenta puxar a foto e o nome do perfil (o Instagram nem sempre deixa);
// sem isso, a administração envia a foto. A foto fica guardada no banco, já reduzida, porque o
// endereço de imagem do Instagram expira. O site lê os ativos e mostra num carrossel.
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
  Post,
  Put,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  depoimentoSchema,
  fotoDepoimentoSchema,
  nomeDoTituloInstagram,
  perfilDoInstagram,
  type DepoimentoEntrada,
  type DepoimentoNaTela,
  type PerfilInstagram,
} from '@pente-fino/shared';
import type { Response } from 'express';
import sharp from 'sharp';
import type { z } from 'zod';
import { AdminGuard, PapeisPlataforma } from '../admin/admin.guard.js';
import { BancoPlataforma } from '../admin/banco-plataforma.js';
import { Publico } from '../auth/decoradores.js';
import { Erros } from '../comum/erros.js';
import { CONFIGURACAO, type Configuracao } from '../config/configuracao.js';
import { Corpo } from '../comum/validacao.js';

const LADO_FOTO = 240;
const NAVEGADOR =
  'Mozilla/5.0 (compatible; facebookexternalhit/1.1; +http://www.facebook.com/externalhit_uatext.php)';

type Linha = {
  id: string;
  instagram: string;
  nome: string;
  quem: string;
  texto: string;
  data: Date;
  ativo: boolean;
  fotoTipo: string | null;
  atualizadoEm: Date;
};

const naTela = (d: Linha): DepoimentoNaTela => ({
  id: d.id,
  instagram: d.instagram,
  nome: d.nome,
  quem: d.quem,
  texto: d.texto,
  data: d.data.toISOString().slice(0, 10),
  ativo: d.ativo,
  // O carimbo da última mudança força o navegador a buscar a foto nova.
  foto: d.fotoTipo ? `/api/publico/depoimentos/${d.id}/foto?v=${d.atualizadoEm.getTime()}` : null,
});

const SEM_FOTO = {
  id: true,
  instagram: true,
  nome: true,
  quem: true,
  texto: true,
  data: true,
  ativo: true,
  fotoTipo: true,
  atualizadoEm: true,
} as const;

/** Foto quadrada, pequena e leve, em WebP. */
async function reduzir(original: Buffer): Promise<Buffer> {
  return sharp(original, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize(LADO_FOTO, LADO_FOTO, { fit: 'cover' })
    .webp({ quality: 80 })
    .toBuffer();
}

const meta = (html: string, prop: string) =>
  html
    .match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1]
    ?.replace(/&amp;/g, '&') ?? null;

@Injectable()
export class DepoimentosService {
  private readonly log = new Logger('Depoimentos');
  constructor(
    @Inject(BancoPlataforma) private readonly banco: BancoPlataforma,
    @Inject(CONFIGURACAO) private readonly config: Configuracao,
  ) {}

  async ativos(): Promise<DepoimentoNaTela[]> {
    const linhas = await this.banco.prisma.depoimentoSite.findMany({
      where: { ativo: true },
      orderBy: { data: 'desc' },
      select: SEM_FOTO,
    });
    return linhas.map(naTela);
  }

  async todos(): Promise<DepoimentoNaTela[]> {
    const linhas = await this.banco.prisma.depoimentoSite.findMany({
      orderBy: { data: 'desc' },
      select: SEM_FOTO,
    });
    return linhas.map(naTela);
  }

  async foto(id: string): Promise<{ dados: Buffer; tipo: string } | null> {
    const d = await this.banco.prisma.depoimentoSite.findUnique({
      where: { id },
      select: { foto: true, fotoTipo: true, ativo: true },
    });
    return d?.foto && d.fotoTipo && d.ativo
      ? { dados: Buffer.from(d.foto), tipo: d.fotoTipo }
      : null;
  }

  /**
   * Tenta ler a página pública do perfil (og:title e og:image). O Instagram às vezes pede login:
   * aí volta sem nome e sem foto, e a administração envia a foto.
   */
  async buscarPerfil(perfil: string): Promise<{ nome: string | null; foto: Buffer | null }> {
    // Nos testes, nada de internet: segue sem nome e sem foto, como quando o Instagram pede login.
    if (this.config.ambiente === 'test') return { nome: null, foto: null };
    try {
      const r = await fetch(`https://www.instagram.com/${encodeURIComponent(perfil)}/`, {
        headers: { 'user-agent': NAVEGADOR, 'accept-language': 'pt-BR' },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) return { nome: null, foto: null };
      const html = await r.text();
      const nome = nomeDoTituloInstagram(meta(html, 'og:title'));
      const imagem = meta(html, 'og:image');
      if (!imagem || !/^https:\/\/[^/]*(cdninstagram|fbcdn)\.[a-z.]+\//.test(imagem))
        return { nome, foto: null };
      const img = await fetch(imagem, { signal: AbortSignal.timeout(8000) });
      if (!img.ok) return { nome, foto: null };
      const bruto = Buffer.from(await img.arrayBuffer());
      if (bruto.length > 5_000_000) return { nome, foto: null };
      return { nome, foto: await reduzir(bruto) };
    } catch (e) {
      this.log.warn(`Instagram @${perfil}: ${(e as Error).message}`);
      return { nome: null, foto: null };
    }
  }

  async perfil(texto: string): Promise<PerfilInstagram> {
    const perfil = perfilDoInstagram(texto);
    if (!perfil)
      throw Erros.validacao([{ campo: 'instagram', mensagem: 'Cole o link ou o @ do Instagram.' }]);
    const r = await this.buscarPerfil(perfil);
    return { perfil, nome: r.nome, temFoto: !!r.foto };
  }

  async criar(d: DepoimentoEntrada): Promise<DepoimentoNaTela> {
    const { foto } = await this.buscarPerfil(d.instagram);
    const linha = await this.banco.prisma.depoimentoSite.create({
      data: {
        ...d,
        data: new Date(`${d.data}T00:00:00Z`),
        ...(foto ? { foto: new Uint8Array(foto), fotoTipo: 'image/webp' } : {}),
      },
      select: SEM_FOTO,
    });
    return naTela(linha);
  }

  async alterar(id: string, d: DepoimentoEntrada): Promise<DepoimentoNaTela> {
    const linha = await this.banco.prisma.depoimentoSite
      .update({
        where: { id },
        data: { ...d, data: new Date(`${d.data}T00:00:00Z`) },
        select: SEM_FOTO,
      })
      .catch(() => {
        throw Erros.naoEncontrado('Depoimento não encontrado.');
      });
    return naTela(linha);
  }

  async enviarFoto(id: string, base64: string): Promise<DepoimentoNaTela> {
    let foto: Buffer;
    try {
      foto = await reduzir(Buffer.from(base64.replace(/^data:[^,]+,/, ''), 'base64'));
    } catch {
      throw Erros.validacao([{ campo: 'foto', mensagem: 'Não deu para ler a imagem.' }]);
    }
    const linha = await this.banco.prisma.depoimentoSite.update({
      where: { id },
      data: { foto: new Uint8Array(foto), fotoTipo: 'image/webp' },
      select: SEM_FOTO,
    });
    return naTela(linha);
  }

  async apagar(id: string): Promise<void> {
    await this.banco.prisma.depoimentoSite.deleteMany({ where: { id } });
  }
}

@ApiTags('Site')
@Controller('publico/depoimentos')
@Publico()
export class DepoimentosPublicoController {
  constructor(@Inject(DepoimentosService) private readonly servico: DepoimentosService) {}

  @Get()
  @ApiOperation({ summary: 'Depoimentos ativos da página de vendas (carrossel)' })
  lista(): Promise<DepoimentoNaTela[]> {
    return this.servico.ativos();
  }

  @Get(':id/foto')
  @ApiOperation({ summary: 'Foto de um depoimento ativo' })
  async foto(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response): Promise<void> {
    const f = await this.servico.foto(id);
    if (!f) {
      res
        .status(404)
        .json({ erro: { codigo: 'nao_encontrado', mensagem: 'Foto não encontrada.' } });
      return;
    }
    res
      .status(200)
      .set({ 'content-type': f.tipo, 'cache-control': 'public, max-age=86400' })
      .send(f.dados);
  }
}

@ApiTags('Administração do sistema')
@ApiBearerAuth()
@Controller('admin/depoimentos')
@Publico()
@UseGuards(AdminGuard)
export class AdminDepoimentosController {
  constructor(@Inject(DepoimentosService) private readonly servico: DepoimentosService) {}

  @Get()
  @PapeisPlataforma('admin')
  @ApiOperation({ summary: 'Todos os depoimentos (ativos e escondidos)' })
  lista(): Promise<DepoimentoNaTela[]> {
    return this.servico.todos();
  }

  @Post('instagram')
  @PapeisPlataforma('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tentar puxar o nome e a foto do perfil do Instagram' })
  perfil(@Corpo(depoimentoSchema.pick({ instagram: true })) d: { instagram: string }) {
    return this.servico.perfil(d.instagram);
  }

  @Post()
  @PapeisPlataforma('admin')
  @ApiOperation({ summary: 'Novo depoimento (tenta puxar a foto do Instagram)' })
  criar(@Corpo(depoimentoSchema) d: DepoimentoEntrada): Promise<DepoimentoNaTela> {
    return this.servico.criar(d);
  }

  @Put(':id')
  @PapeisPlataforma('admin')
  @ApiOperation({ summary: 'Alterar o depoimento (texto, data, mostrar ou esconder)' })
  alterar(
    @Param('id', ParseUUIDPipe) id: string,
    @Corpo(depoimentoSchema) d: DepoimentoEntrada,
  ): Promise<DepoimentoNaTela> {
    return this.servico.alterar(id, d);
  }

  @Put(':id/foto')
  @PapeisPlataforma('admin')
  @ApiOperation({ summary: 'Enviar a foto (quando o Instagram não deixa puxar)' })
  foto(
    @Param('id', ParseUUIDPipe) id: string,
    @Corpo(fotoDepoimentoSchema) d: z.infer<typeof fotoDepoimentoSchema>,
  ): Promise<DepoimentoNaTela> {
    return this.servico.enviarFoto(id, d.base64);
  }

  @Delete(':id')
  @PapeisPlataforma('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Apagar o depoimento' })
  apagar(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.servico.apagar(id);
  }
}
