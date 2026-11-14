import { describe, expect, it } from 'vitest';
import {
  cadastroIndicadorSchema,
  codigoIndicacaoSchema,
  comissaoDaMensalidade,
  dentroDoPrazoDeComissao,
  gerarCodigoIndicacao,
  indicacaoDaContaSchema,
  resumoDoIndicador,
  type ComissaoIndicacao,
} from './indicacao.js';

const agora = new Date('2026-11-14T12:00:00Z');
const c = (p: Partial<ComissaoIndicacao>): ComissaoIndicacao => ({
  id: 'x',
  tipo: 'pix',
  valor: 2000,
  liberaEm: '2026-11-01T00:00:00Z',
  pagaEm: null,
  canceladaEm: null,
  aplicadaEm: null,
  ...p,
});

describe('indique e ganhe', () => {
  it('20% da mensalidade, nos 12 primeiros meses', () => {
    expect(comissaoDaMensalidade(14990)).toBe(2998);
    const primeiro = new Date('2026-01-10T12:00:00Z');
    expect(dentroDoPrazoDeComissao(primeiro, new Date('2026-12-10T12:00:00Z'))).toBe(true);
    expect(dentroDoPrazoDeComissao(primeiro, new Date('2027-01-10T12:00:00Z'))).toBe(false);
  });

  it('resumo: a liberar, liberado, pago, cancelado fora; Pix só a partir de R$ 50', () => {
    const r = resumoDoIndicador(
      [
        c({ valor: 3000 }),
        c({ valor: 2500 }),
        c({ valor: 1000, liberaEm: '2026-12-01T00:00:00Z' }),
        c({ valor: 4000, pagaEm: '2026-10-05T00:00:00Z' }),
        c({ valor: 9999, canceladaEm: '2026-11-02T00:00:00Z' }),
        c({ tipo: 'mes', valor: 0 }),
        c({ tipo: 'mes', valor: 0, aplicadaEm: '2026-11-03T00:00:00Z' }),
      ],
      agora,
    );
    expect(r).toEqual({
      aLiberar: 1000,
      liberado: 5500,
      pago: 4000,
      podeReceber: true,
      mesesGanhos: 2,
      mesesAplicados: 1,
    });
    expect(resumoDoIndicador([c({ valor: 4999 })], agora).podeReceber).toBe(false);
  });

  it('código fácil de ditar e o cadastro com CPF e chave Pix', () => {
    const cod = gerarCodigoIndicacao();
    expect(cod).toMatch(/^[A-HJ-NP-Z2-9]{7}$/);
    expect(codigoIndicacaoSchema.parse(' abc2345 ')).toBe('ABC2345');
    expect(codigoIndicacaoSchema.safeParse('ab').success).toBe(false);
    expect(
      cadastroIndicadorSchema.safeParse({
        nome: 'João',
        email: 'Joao@Exemplo.com',
        cpf: '529.982.247-25',
        chavePix: 'joao@exemplo.com',
      }).success,
    ).toBe(true);
    expect(
      cadastroIndicadorSchema.safeParse({
        nome: 'João',
        email: 'x@y.z',
        cpf: '111.111.111-11',
        chavePix: 'x',
      }).success,
    ).toBe(false);
    expect(indicacaoDaContaSchema.safeParse({ recebe: 'meses' }).success).toBe(true);
    expect(indicacaoDaContaSchema.safeParse({ recebe: 'pix' }).success).toBe(false);
  });
});
