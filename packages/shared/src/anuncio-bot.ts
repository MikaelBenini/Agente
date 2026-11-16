// Mensagens automáticas para quem vem de anúncio (pedido do dono em 16/11/2026): quem chega por
// um anúncio do Facebook/Instagram (clique para o WhatsApp), ou escreve a frase pronta do anúncio,
// recebe uma conversa própria, sem o menu do bot: as perguntas em sequência, a mensagem final e a
// passagem para a equipe, que vê as respostas e a marca "Veio de anúncio" na tela Conversas.
import { z } from 'zod';
import { EXPIRACAO_ATENDENTE_MIN, normalizar, preencher, type SessaoBot } from './bot.js';

/** Origem do cliente que chegou por anúncio (`cliente.origem_lead`). */
export const ORIGEM_ANUNCIO = 'anuncio';

export interface FluxoAnuncio {
  ativo: boolean;
  /** Frases prontas do anúncio ("Olá! Quero saber mais"): quem escreve uma delas entra no fluxo. */
  frases: string[];
  /** Mensagens em sequência; depois de cada uma, o bot espera a resposta do cliente. */
  etapas: string[];
  /** Fecha a conversa automática e passa para a equipe. */
  final: string;
}

export const FLUXO_ANUNCIO_PADRAO: Readonly<FluxoAnuncio> = {
  ativo: false,
  frases: ['Olá! Quero saber mais.', 'Vi o anúncio'],
  etapas: [
    'Oi, {cliente}! Que bom que você veio pelo nosso anúncio. 😊 Qual serviço te interessou?',
    'Perfeito! Qual dia e horário ficam melhores para você?',
  ],
  final: 'Anotado! Já passei para a nossa equipe, que te responde por aqui em instantes.',
};

const textoEtapa = z
  .string()
  .trim()
  .min(1, { error: 'Escreva a mensagem.' })
  .max(1000, { error: 'No máximo 1.000 caracteres.' });

export const fluxoAnuncioSchema = z.object({
  ativo: z.boolean(),
  frases: z
    .array(z.string().trim().min(3, { error: 'Frase muito curta.' }).max(120))
    .max(10, { error: 'No máximo 10 frases.' }),
  etapas: z
    .array(textoEtapa)
    .min(1, { error: 'Escreva pelo menos uma mensagem.' })
    .max(5, { error: 'No máximo 5 mensagens antes de passar para a equipe.' }),
  final: textoEtapa,
});
export type FluxoAnuncioEntrada = z.infer<typeof fluxoAnuncioSchema>;
/** O fluxo de um escopo: `proprio` = a unidade tem o dela (no padrão da conta, sempre true). */
export type FluxoAnuncioDoEscopo = FluxoAnuncio & { proprio: boolean };

/** O que está gravado passa de novo pelo esquema; estragado ou vazio = o padrão (desligado). */
export function lerFluxoAnuncio(valor: unknown): FluxoAnuncio {
  const r = fluxoAnuncioSchema.safeParse(valor);
  return r.success ? r.data : (structuredClone(FLUXO_ANUNCIO_PADRAO) as FluxoAnuncio);
}

/** A mensagem é a frase pronta de um anúncio (sem diferença de acento, maiúscula e pontuação)? */
export function ehFraseDeAnuncio(fluxo: FluxoAnuncio, entrada: string): boolean {
  const t = normalizar(entrada);
  return (
    !!t &&
    fluxo.frases.some((f) => {
      const n = normalizar(f);
      return !!n && (t === n || t.startsWith(`${n} `) || t.includes(n));
    })
  );
}

/** Respostas do cliente no fluxo, em uma linha para a equipe. */
export const resumoDoAnuncio = (respostas: readonly string[]) =>
  respostas.length ? `Do anúncio: ${respostas.join(' · ')}` : 'Do anúncio';

export interface ResultadoAnuncio {
  respostas: string[];
  sessao: SessaoBot;
  /** Terminou: passa para a equipe (tela Conversas). */
  paraEquipe: boolean;
  /** Começou agora (para marcar a conversa como vinda de anúncio). */
  comecou: boolean;
}

/**
 * Uma mensagem no fluxo do anúncio, ou null quando não é com ele (segue o bot normal).
 * Começa com o anúncio detectado pelo WhatsApp ou com a frase pronta; segue enquanto há
 * etapas; no fim manda a mensagem final e passa para a equipe.
 */
export function responderAnuncio(
  fluxo: FluxoAnuncio,
  sessaoAnterior: SessaoBot | null,
  entrada: string,
  agora: Date,
  doAnuncio: boolean,
  cliente: string | null,
): ResultadoAnuncio | null {
  if (!fluxo.ativo || fluxo.etapas.length === 0) return null;
  const texto = (t: string) => preencher(t, { cliente: cliente?.trim().split(/\s+/)[0] ?? null });
  const agoraIso = agora.toISOString();
  const emAndamento =
    sessaoAnterior?.anuncio &&
    !sessaoAnterior.comAtendente &&
    agora.getTime() - Date.parse(sessaoAnterior.ultimaEm) <= EXPIRACAO_ATENDENTE_MIN * 60_000;

  if (emAndamento) {
    const a = sessaoAnterior!.anuncio!;
    const respostas = [...a.respostas, entrada.trim().slice(0, 300)].filter(Boolean);
    const proxima = a.etapa + 1;
    if (proxima < fluxo.etapas.length)
      return {
        respostas: [texto(fluxo.etapas[proxima]!)],
        sessao: {
          ...sessaoAnterior!,
          ultimaEm: agoraIso,
          erros: 0,
          anuncio: { ...a, etapa: proxima, respostas },
        },
        paraEquipe: false,
        comecou: false,
      };
    const resto: SessaoBot = { ...sessaoAnterior! };
    delete resto.anuncio;
    return {
      respostas: [texto(fluxo.final)],
      sessao: {
        ...resto,
        ultimaEm: agoraIso,
        erros: 0,
        caminho: [],
        comAtendente: true,
        respostasAnuncio: respostas,
      },
      paraEquipe: true,
      comecou: false,
    };
  }

  // Já com a equipe: quem responde é a recepção.
  if (sessaoAnterior?.comAtendente) return null;
  if (!doAnuncio && !ehFraseDeAnuncio(fluxo, entrada)) return null;
  return {
    respostas: [texto(fluxo.etapas[0]!)],
    sessao: {
      caminho: [],
      comAtendente: false,
      ultimaEm: agoraIso,
      erros: 0,
      anuncio: { etapa: 0, respostas: [] },
    },
    paraEquipe: false,
    comecou: true,
  };
}

// ─── Relatório: clientes de anúncio (sugestão aprovada em 16/11/2026) ─────

export interface ResumoAnuncios {
  /** Conversas que chegaram por anúncio no período. */
  conversas: number;
  /** Clientes novos cuja origem é o anúncio, cadastrados no período. */
  novosClientes: number;
  /** Clientes de anúncio (de qualquer época) com comanda fechada no período. */
  clientesQueCompraram: number;
  /** O que esses clientes gastaram no período (comandas fechadas), em centavos. */
  faturamento: number;
  /** Faturamento ÷ clientes que compraram (0 sem clientes). */
  ticket: number;
  /** Conversas por anúncio (título que o WhatsApp manda; sem título = "Sem título"). */
  porAnuncio: { titulo: string; conversas: number }[];
}

/** Junta conversas, cadastros e comandas dos clientes de anúncio no período. */
export function resumirAnuncios(d: {
  conversas: readonly { titulo: string | null }[];
  novosClientes: number;
  comandas: readonly { clienteId: string; total: number }[];
}): ResumoAnuncios {
  const clientes = new Set(d.comandas.map((c) => c.clienteId));
  const faturamento = d.comandas.reduce((t, c) => t + c.total, 0);
  const porTitulo = new Map<string, number>();
  for (const c of d.conversas) {
    const t = c.titulo?.trim() || 'Sem título';
    porTitulo.set(t, (porTitulo.get(t) ?? 0) + 1);
  }
  return {
    conversas: d.conversas.length,
    novosClientes: d.novosClientes,
    clientesQueCompraram: clientes.size,
    faturamento,
    ticket: clientes.size ? Math.round(faturamento / clientes.size) : 0,
    porAnuncio: [...porTitulo]
      .map(([titulo, conversas]) => ({ titulo, conversas }))
      .sort((a, b) => b.conversas - a.conversas || a.titulo.localeCompare(b.titulo)),
  };
}
