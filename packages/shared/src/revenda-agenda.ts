// Revenda conforme a necessidade (Plano Agenda, pedido do dono em 13/11): o convite para subir
// aparece na hora em que a barbearia precisa, nunca como propaganda solta.
// - O Início do Agenda mostra os números da própria agenda no lugar do faturamento.
// - Depois de 30 dias de conta, um convite com esses números ("No Básico você vê quanto isso deu").
// - Muitas faltas no mês sugerem as Automações (lembrete com confirmação e lista de espera).
// - "Experimentar 7 dias": o Básico liberado por uma semana, uma vez por conta.
import {
  PRECO_AUTOMACOES,
  PRECOS_PLANO,
  temRecurso,
  type PlanoConta,
  type Recurso,
} from './planos.js';
import { formatarMoeda } from './formatacao.js';

/** Um horário do mês, como o banco devolve para o resumo da agenda. */
export interface HorarioDoMes {
  /** Situação do agendamento: agendado, confirmado, atendido, cancelado ou falta. */
  status: string;
  inicio: string;
  /** Origem do agendamento: balcao, app, bot ou link. */
  origem: string | null;
  /** O cliente foi cadastrado neste mês (cliente novo). */
  clienteNovo: boolean;
}

export interface ResumoDaAgenda {
  marcados: number;
  /** Horários que já passaram e não foram cancelados nem falta. */
  atendidos: number;
  faltas: number;
  cancelados: number;
  /** Ainda por vir no mês. */
  aVir: number;
  clientesNovos: number;
  /** Marcados pelo próprio cliente (link, site ou WhatsApp). */
  peloCliente: number;
}

/** Marcados pelo próprio cliente: o link de agendamento e a conversa no WhatsApp. */
const DO_CLIENTE = new Set(['link', 'bot']);

/** Os números da agenda do mês (Início do Agenda). */
export function resumoDaAgenda(horarios: readonly HorarioDoMes[], agora: Date): ResumoDaAgenda {
  const r: ResumoDaAgenda = {
    marcados: horarios.length,
    atendidos: 0,
    faltas: 0,
    cancelados: 0,
    aVir: 0,
    clientesNovos: 0,
    peloCliente: 0,
  };
  for (const h of horarios) {
    if (h.status === 'falta') r.faltas++;
    else if (h.status === 'cancelado') r.cancelados++;
    else if (Date.parse(h.inicio) <= agora.getTime()) {
      r.atendidos++;
      if (h.clienteNovo) r.clientesNovos++;
    } else r.aVir++;
    if (h.origem && DO_CLIENTE.has(h.origem)) r.peloCliente++;
  }
  return r;
}

/** Faltas que pedem as Automações: pelo menos 3 e 10% dos horários que já passaram. */
export function muitasFaltas(r: ResumoDaAgenda): boolean {
  const passados = r.atendidos + r.faltas;
  return r.faltas >= 3 && passados > 0 && r.faltas / passados >= 0.1;
}

export type ConviteDoInicio =
  | { tipo: 'basico'; titulo: string; texto: string }
  | { tipo: 'automacoes'; titulo: string; texto: string }
  | { tipo: 'conta'; titulo: string; texto: string };

/**
 * O convite do Início, no máximo um por vez, na ordem do que mais ajuda agora:
 * 1. muitas faltas e sem as Automações: as Automações;
 * 2. Agenda (ou Agenda com Automações) há 30 dias ou mais: o Básico, com os números do mês;
 * 3. quem paga as Automações e chega perto do Básico: a conta de quanto falta.
 */
export function conviteDoInicio(d: {
  plano: PlanoConta;
  automacoes: boolean;
  diasDeConta: number;
  resumo: ResumoDaAgenda;
}): ConviteDoInicio | null {
  if (d.plano !== 'agenda') return null;
  const { resumo } = d;
  if (!d.automacoes && muitasFaltas(resumo))
    return {
      tipo: 'automacoes',
      titulo: `${resumo.faltas} faltas este mês`,
      texto: `Com as Automações, o cliente recebe o lembrete e confirma pelo WhatsApp, e o horário que vaga vai para quem está na lista de espera. Mais ${formatarMoeda(PRECO_AUTOMACOES.mensal)} por mês.`,
    };
  if (d.diasDeConta >= 30 && resumo.atendidos > 0)
    return {
      tipo: 'basico',
      titulo: `Você atendeu ${resumo.atendidos} ${resumo.atendidos === 1 ? 'horário' : 'horários'} este mês`,
      texto:
        'No Básico você vê quanto isso deu de faturamento e de lucro, com a comanda, o caixa do dia e a comissão de cada barbeiro.',
    };
  if (d.automacoes)
    return {
      tipo: 'conta',
      titulo: 'Já pensou no Básico?',
      texto: `Agenda com as Automações sai ${formatarMoeda(PRECOS_PLANO.agenda.mensal + PRECO_AUTOMACOES.mensal)} por mês. O Básico custa ${formatarMoeda(PRECOS_PLANO.basico.mensal)} e traz tudo: a agenda, o caixa, a comanda e o quanto sobra no fim do mês (as Automações continuam à parte).`,
    };
  return null;
}

// ─── Experimentar o Básico por 7 dias ─────────────────────────────────────

export const DIAS_EXPERIMENTAR = 7;

/**
 * O plano que vale para os recursos: no Agenda, durante a experiência de 7 dias, vale o Básico
 * (os limites de unidades e barbeiros continuam os do Agenda).
 */
export function planoDosRecursos(
  plano: PlanoConta,
  experimentaAte: string | Date | null | undefined,
  agora: Date,
): PlanoConta {
  if (plano !== 'agenda' || !experimentaAte) return plano;
  return new Date(experimentaAte).getTime() > agora.getTime() ? 'basico' : plano;
}

/** Pode começar a experiência? Só no Agenda e uma vez por conta. */
export function podeExperimentar(plano: PlanoConta, experimentouEm: string | Date | null): boolean {
  return plano === 'agenda' && !experimentouEm;
}

/** A conta tem o recurso agora? Plano, Automações à parte e a experiência de 7 dias juntos. */
export function recursoDaConta(
  conta: { plano: PlanoConta; automacoes: boolean; experimentaAte?: string | Date | null },
  r: Recurso,
  agora: Date = new Date(),
): boolean {
  return temRecurso(
    planoDosRecursos(conta.plano, conta.experimentaAte, agora),
    r,
    conta.automacoes,
  );
}
