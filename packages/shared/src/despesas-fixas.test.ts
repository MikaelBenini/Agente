import { describe, expect, it } from 'vitest';
import {
  copiarFixasSchema,
  descricaoSalario,
  despesaSchema,
  vencimentoNoMesSeguinte,
} from './esquemas-resultados.js';

describe('despesas fixas no mês seguinte', () => {
  it('o vencimento vai para o mesmo dia do mês seguinte, sem pular mês curto', () => {
    expect(vencimentoNoMesSeguinte('2026-11-10')).toBe('2026-12-10');
    expect(vencimentoNoMesSeguinte('2026-12-05')).toBe('2027-01-05');
    expect(vencimentoNoMesSeguinte('2027-01-31')).toBe('2027-02-28');
    expect(vencimentoNoMesSeguinte(null)).toBeNull();
  });

  it('"repetir todo mês" é desligado por padrão', () => {
    const d = despesaSchema.parse({
      unidadeId: null,
      categoriaId: '0193a5b2-7c1d-7e8f-9a0b-1c2d3e4f5a6b',
      descricao: 'Aluguel',
      valor: 250000,
      competencia: '2026-11',
    });
    expect(d.repetir).toBe(false);
  });

  it('a cópia pede pelo menos uma despesa e valor maior que zero', () => {
    expect(copiarFixasSchema.safeParse({ mes: '2026-12', itens: [] }).success).toBe(false);
    const item = { origemId: '0193a5b2-7c1d-7e8f-9a0b-1c2d3e4f5a6b', vencimento: null };
    expect(
      copiarFixasSchema.safeParse({ mes: '2026-12', itens: [{ ...item, valor: 0 }] }).success,
    ).toBe(false);
    expect(
      copiarFixasSchema.safeParse({ mes: '2026-12', itens: [{ ...item, valor: 1 }] }).success,
    ).toBe(true);
  });

  it('item de salário: o barbeiro no lugar da despesa de origem, nunca os dois', () => {
    const prof = '0193a5b2-7c1d-7e8f-9a0b-1c2d3e4f5a6c';
    const origem = '0193a5b2-7c1d-7e8f-9a0b-1c2d3e4f5a6b';
    const base = { valor: 150_000, vencimento: null };
    const ok = (i: object) => copiarFixasSchema.safeParse({ mes: '2026-12', itens: [i] }).success;
    expect(ok({ ...base, profissionalId: prof })).toBe(true);
    expect(ok({ ...base, profissionalId: prof, origemId: origem })).toBe(false);
    expect(ok(base)).toBe(false);
    expect(descricaoSalario('Diego Prado')).toBe('Salário: Diego Prado');
  });
});
