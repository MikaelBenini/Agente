// Bot mais esperto, sem IA (lista do dono em 16/11/2026): ler serviço, dia e hora numa frase
// ("quero cortar amanhã às 15h"), responder o preço de um serviço só e dizer quando a recepção
// volta. Tudo por palavras e regras de data; quem consulta a agenda é packages/db.
import { normalizar, type TurnoBot } from './bot.js';

export interface ServicoCitavel {
  id: string;
  nome: string;
}

const PALAVRAS_FRACAS = new Set(['de', 'da', 'do', 'com', 'e', 'a', 'o', 'na', 'no', 'para']);

/**
 * O serviço que o texto (já normalizado) cita: o nome inteiro, ou uma palavra do nome pelo
 * começo ("cortar" → "Corte", "barba" → "Barba"). Só quando um serviço só combina; entre
 * "Corte" e "Corte + barba", vence o que tem mais palavras citadas.
 */
export function servicosCitados<T extends ServicoCitavel>(
  texto: string,
  servicos: readonly T[],
): T[] {
  const tokens = texto.split(' ').filter(Boolean);
  const nota = (s: T) => {
    const palavras = normalizar(s.nome)
      .split(' ')
      .filter((p) => p.length >= 4 && !PALAVRAS_FRACAS.has(p));
    if (palavras.length === 0) return 0;
    const citadas = palavras.filter((p) =>
      tokens.some(
        (t) =>
          t === p || (t.length >= 4 && t.startsWith(p.slice(0, 4)) && t.length <= p.length + 3),
      ),
    );
    // Todas as palavras do nome citadas valem mais que uma só.
    return citadas.length === 0
      ? 0
      : citadas.length === palavras.length
        ? 10 + citadas.length
        : citadas.length;
  };
  const comNota = servicos.map((s) => ({ s, n: nota(s) })).filter((x) => x.n > 0);
  if (comNota.length === 0) return [];
  const melhor = Math.max(...comNota.map((x) => x.n));
  const vencedores = comNota.filter((x) => x.n === melhor).map((x) => x.s);
  return vencedores.length === 1 ? vencedores : [];
}

/** "quanto é", "preço", "valor", "custa", "cobra": o cliente perguntou o preço. */
export function perguntaDePreco(texto: string): boolean {
  return /\b(quanto|quantos|preco|precos|valor|valores|custa|custam|cobra|cobram|tabela)\b/.test(
    texto,
  );
}

const SEMANA_NORMALIZADA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

function somarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Dia citado: hoje, amanhã, depois de amanhã, um dia da semana (o próximo) ou 25/12. */
export function lerDia(texto: string, original: string, hoje: string): string | null {
  if (/\bdepois de amanha\b/.test(texto)) return somarDias(hoje, 2);
  if (/\bamanha\b/.test(texto)) return somarDias(hoje, 1);
  if (/\bhoje\b/.test(texto)) return hoje;
  const semana = new Date(`${hoje}T12:00:00Z`).getUTCDay();
  for (let i = 0; i < 7; i++) {
    if (new RegExp(`\\b${SEMANA_NORMALIZADA[i]}\\b`).test(texto)) {
      const falta = (i - semana + 7) % 7;
      return somarDias(hoje, falta);
    }
  }
  const data = /\b(\d{1,2})\/(\d{1,2})\b/.exec(original);
  if (data) {
    const dia = Number(data[1]);
    const mes = Number(data[2]);
    if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
      const ano = Number(hoje.slice(0, 4));
      const candidato = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      return candidato >= hoje
        ? candidato
        : `${ano + 1}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    }
  }
  return null;
}

/** Hora citada, em minutos do dia: 15h, 15h30, 15:30, às 15, 15 horas, meio-dia. */
export function lerHora(texto: string, original: string): number | null {
  if (/\bmeio dia\b/.test(texto)) return 12 * 60;
  const valida = (h: number, m: number) =>
    h >= 6 && h <= 23 && m >= 0 && m < 60 ? h * 60 + m : null;
  const comDoisPontos = /\b(\d{1,2}):(\d{2})\b/.exec(original);
  if (comDoisPontos) return valida(Number(comDoisPontos[1]), Number(comDoisPontos[2]));
  const comH = /\b(\d{1,2})h(\d{2})?\b/.exec(texto);
  if (comH) return valida(Number(comH[1]), Number(comH[2] ?? 0));
  const horas = /\b(\d{1,2}) horas?\b/.exec(texto) ?? /\bas (\d{1,2})\b/.exec(texto);
  if (horas) {
    const h = Number(horas[1]);
    // "às 3" à tarde: barbearia não abre às 3 da manhã.
    return valida(h < 8 ? h + 12 : h, 0);
  }
  return null;
}

export interface PedidoNatural {
  servicoIds: string[];
  /** AAAA-MM-DD ou null (o bot pergunta). */
  dia: string | null;
  /** Minutos do dia ou null (o bot mostra os horários). */
  minuto: number | null;
}

/**
 * "Quero cortar amanhã às 15h": o serviço e pelo menos o dia ou a hora. Sem serviço, ou sem dia
 * e hora, não é um pedido (segue o menu). Hora sem dia: hoje, ou amanhã se a hora já passou.
 */
export function lerPedidoNatural(
  original: string,
  servicos: readonly ServicoCitavel[],
  hoje: string,
  minutoAgora: number,
): PedidoNatural | null {
  const texto = normalizar(original);
  if (perguntaDePreco(texto)) return null;
  const citados = servicosCitados(texto, servicos);
  if (citados.length === 0) return null;
  const minuto = lerHora(texto, original);
  let dia = lerDia(texto, original, hoje);
  if (!dia && minuto === null) return null;
  if (!dia) dia = minuto! > minutoAgora ? hoje : somarDias(hoje, 1);
  return { servicoIds: citados.map((s) => s.id), dia, minuto };
}

const NOME_DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const horaTexto = (min: number) =>
  `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}`;

/**
 * Quando a recepção volta, a partir de agora (horário de São Paulo): "hoje às 14h",
 * "amanhã às 9h" ou "segunda às 9h". Sem turnos, null.
 */
export function proximaAbertura(turnos: readonly TurnoBot[], agora: Date): string | null {
  if (turnos.length === 0) return null;
  const local = new Date(agora.getTime() - 3 * 3_600_000);
  const dia = local.getUTCDay();
  const min = local.getUTCHours() * 60 + local.getUTCMinutes();
  for (let i = 0; i < 8; i++) {
    const d = (dia + i) % 7;
    const inicios = turnos
      .filter((t) => t.diaSemana === d && (i > 0 || t.inicioMin > min))
      .map((t) => t.inicioMin)
      .sort((a, b) => a - b);
    if (inicios.length === 0) continue;
    const quando = i === 0 ? 'hoje' : i === 1 ? 'amanhã' : NOME_DIA[d];
    return `${quando} às ${horaTexto(inicios[0]!)}`;
  }
  return null;
}

/** O pedido guardado na sessão, em uma linha para a equipe. */
export function descreverPedido(
  a: {
    servicoIds: readonly string[];
    profissionalId: string | null;
    dia: string | null;
    escolha: { inicio: string; profissionalId: string } | null;
  },
  nomes: ReadonlyMap<string, string>,
  hoje: string,
): string | null {
  const partes: string[] = [];
  const servicos = a.servicoIds.map((id) => nomes.get(id)).filter(Boolean);
  if (servicos.length) partes.push(servicos.join(' + '));
  const prof = a.escolha?.profissionalId ?? a.profissionalId;
  if (prof && nomes.get(prof)) partes.push(`com ${nomes.get(prof)}`);
  if (a.escolha) {
    const local = new Date(new Date(a.escolha.inicio).getTime() - 3 * 3_600_000);
    const dia = local.toISOString().slice(0, 10);
    const quando =
      dia === hoje
        ? 'hoje'
        : `${NOME_DIA[local.getUTCDay()]}, ${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
    partes.push(`${quando} às ${horaTexto(local.getUTCHours() * 60 + local.getUTCMinutes())}`);
  } else if (a.dia) {
    const d = new Date(`${a.dia}T12:00:00Z`);
    partes.push(
      `${a.dia === hoje ? 'hoje' : NOME_DIA[d.getUTCDay()]}, ${a.dia.slice(8, 10)}/${a.dia.slice(5, 7)}`,
    );
  }
  return partes.length ? partes.join(' · ') : null;
}
