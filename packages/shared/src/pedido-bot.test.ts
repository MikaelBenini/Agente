import { describe, expect, it } from 'vitest';
import { normalizar } from './bot.js';
import {
  lerDia,
  lerHora,
  lerPedidoNatural,
  perguntaDePreco,
  proximaAbertura,
  servicosCitados,
} from './pedido-bot.js';

const SERVICOS = [
  { id: 'c', nome: 'Corte' },
  { id: 'b', nome: 'Barba' },
  { id: 'cb', nome: 'Corte + barba' },
  { id: 's', nome: 'Sobrancelha' },
];
// 16/11/2026 é segunda-feira.
const HOJE = '2026-11-16';

describe('pedido em uma frase (lista do dono em 16/11/2026)', () => {
  it('acha o serviço pelo começo da palavra, sem confundir com barbearia', () => {
    expect(servicosCitados(normalizar('quero cortar o cabelo'), SERVICOS).map((s) => s.id)).toEqual(
      ['c'],
    );
    expect(servicosCitados(normalizar('fazer a barba'), SERVICOS).map((s) => s.id)).toEqual(['b']);
    expect(servicosCitados(normalizar('corte e barba'), SERVICOS).map((s) => s.id)).toEqual(['cb']);
    expect(servicosCitados(normalizar('a barbearia abre?'), SERVICOS)).toEqual([]);
  });

  it('lê o dia: hoje, amanhã, dia da semana e data', () => {
    const d = (t: string) => lerDia(normalizar(t), t, HOJE);
    expect(d('amanhã')).toBe('2026-11-17');
    expect(d('depois de amanhã')).toBe('2026-11-18');
    expect(d('no sábado')).toBe('2026-11-21');
    expect(d('segunda')).toBe('2026-11-16');
    expect(d('dia 25/12')).toBe('2026-12-25');
    expect(d('10/01')).toBe('2027-01-10');
    expect(d('quando der')).toBeNull();
  });

  it('lê a hora em vários jeitos', () => {
    const h = (t: string) => lerHora(normalizar(t), t);
    expect(h('às 15h')).toBe(15 * 60);
    expect(h('15h30')).toBe(15 * 60 + 30);
    expect(h('15:30')).toBe(15 * 60 + 30);
    expect(h('as 3')).toBe(15 * 60);
    expect(h('10 horas')).toBe(10 * 60);
    expect(h('meio-dia')).toBe(12 * 60);
    expect(h('quero cortar')).toBeNull();
  });

  it('"quero cortar amanhã às 15h" vira serviço, dia e hora; sem serviço ou sem quando, não', () => {
    expect(lerPedidoNatural('Quero cortar amanhã às 15h', SERVICOS, HOJE, 10 * 60)).toEqual({
      servicoIds: ['c'],
      dia: '2026-11-17',
      minuto: 15 * 60,
    });
    // Hora sem dia: hoje se ainda vai dar, senão amanhã.
    expect(lerPedidoNatural('barba às 9h', SERVICOS, HOJE, 10 * 60)?.dia).toBe('2026-11-17');
    expect(lerPedidoNatural('barba às 18h', SERVICOS, HOJE, 10 * 60)?.dia).toBe(HOJE);
    expect(lerPedidoNatural('quero marcar amanhã', SERVICOS, HOJE, 600)).toBeNull();
    expect(lerPedidoNatural('quero cortar', SERVICOS, HOJE, 600)).toBeNull();
    // Pergunta de preço não é pedido para marcar.
    expect(lerPedidoNatural('quanto é o corte amanhã?', SERVICOS, HOJE, 600)).toBeNull();
  });

  it('pergunta de preço', () => {
    expect(perguntaDePreco(normalizar('Quanto é a barba?'))).toBe(true);
    expect(perguntaDePreco(normalizar('qual o valor do corte'))).toBe(true);
    expect(perguntaDePreco(normalizar('quero marcar'))).toBe(false);
  });

  it('quando a recepção volta', () => {
    const turnos = [
      { diaSemana: 1, inicioMin: 9 * 60, fimMin: 12 * 60 },
      { diaSemana: 1, inicioMin: 14 * 60, fimMin: 19 * 60 },
      { diaSemana: 2, inicioMin: 9 * 60, fimMin: 19 * 60 },
    ];
    // Segunda 12h30 em São Paulo (15h30 UTC): volta hoje às 14h.
    expect(proximaAbertura(turnos, new Date('2026-11-16T15:30:00Z'))).toBe('hoje às 14h');
    // Segunda 20h: amanhã às 9h.
    expect(proximaAbertura(turnos, new Date('2026-11-16T23:00:00Z'))).toBe('amanhã às 9h');
    // Terça 20h: a próxima é segunda.
    expect(proximaAbertura(turnos, new Date('2026-11-17T23:00:00Z'))).toBe('segunda às 9h');
    expect(proximaAbertura([], new Date())).toBeNull();
  });
});
