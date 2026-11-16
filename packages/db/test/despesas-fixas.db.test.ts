// Despesas fixas no mês seguinte (pedido do dono em 11/11/2026): "Repetir todo mês" lança a cópia
// no mês seguinte, uma vez só, com o vencimento no mesmo dia; quem desmarca para de repetir.
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarPrisma, naConta, repetirDespesasDoMes, type PrismaClient } from '../src/index.js';

const envDaRaiz = new URL('../../../.env', import.meta.url);
if (existsSync(envDaRaiz)) process.loadEnvFile(envDaRaiz);

let prisma: PrismaClient;
const conta = randomUUID();
let categoriaId = '';
const naMinhaConta = <T>(fn: Parameters<typeof naConta<T>>[2]) => naConta(prisma, conta, fn);
const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

beforeAll(async () => {
  prisma = criarPrisma();
  await naMinhaConta(async (tx) => {
    await tx.conta.create({ data: { id: conta, nome: 'Teste despesas fixas' } });
    categoriaId = (await tx.categoriaDespesa.create({ data: { nome: 'Aluguel', grupo: 'fixa' } }))
      .id;
    await tx.despesa.createMany({
      data: [
        {
          categoriaId,
          descricao: 'Aluguel da loja',
          valor: 250000,
          competencia: dia('2026-11-01'),
          vencimento: dia('2026-11-10'),
          repetir: true,
          pago: true,
        },
        {
          categoriaId,
          descricao: 'Internet (não repete)',
          valor: 15000,
          competencia: dia('2026-11-01'),
        },
      ],
    });
  });
});

afterAll(async () => {
  await naMinhaConta((tx) => tx.conta.deleteMany({ where: { id: conta } }));
  await prisma.usuario.deleteMany({ where: { email: `salario-${conta}@teste.dev` } });
  await prisma.$disconnect();
});

describe('repetir todo mês', () => {
  it('lança no mês seguinte só o que repete, em aberto e com o vencimento no mesmo dia; uma vez só', async () => {
    expect(await repetirDespesasDoMes(prisma, conta, '2026-12-01')).toBe(1);
    // Rodar de novo no mesmo mês (a rotina é diária) não duplica.
    expect(await repetirDespesasDoMes(prisma, conta, '2026-12-15')).toBe(0);
    const dezembro = await naMinhaConta((tx) =>
      tx.despesa.findMany({ where: { competencia: dia('2026-12-01') } }),
    );
    expect(dezembro).toHaveLength(1);
    expect(dezembro[0]).toMatchObject({
      descricao: 'Aluguel da loja',
      valor: 250000,
      vencimento: dia('2026-12-10'),
      pago: false,
      repetir: true,
    });
  });

  it('a cópia também repete; desmarcada, o mês seguinte não recebe', async () => {
    expect(await repetirDespesasDoMes(prisma, conta, '2027-01-02')).toBe(1);
    await naMinhaConta((tx) =>
      tx.despesa.updateMany({
        where: { competencia: dia('2027-01-01') },
        data: { repetir: false },
      }),
    );
    expect(await repetirDespesasDoMes(prisma, conta, '2027-02-01')).toBe(0);
  });
});

// Decisão do dono em 16/11/2026: salário de barbeiro na cópia das fixas, um por barbeiro e mês.
describe('salário que repete', () => {
  it('a cópia leva o barbeiro, e o salário já lançado no mês não duplica', async () => {
    const profissionalId = await naMinhaConta(async (tx) => {
      const unidade = await tx.unidade.create({ data: { nome: 'Centro' } });
      const usuario = await tx.usuario.create({
        data: { nome: 'Saulo', email: `salario-${conta}@teste.dev` },
      });
      const p = await tx.profissional.create({
        data: {
          usuarioId: usuario.id,
          unidadeId: unidade.id,
          dataEntrada: dia('2026-01-01'),
          custoFixoMensal: 180000,
        },
      });
      const base = {
        unidadeId: unidade.id,
        categoriaId,
        descricao: 'Salário: Saulo',
        valor: 180000,
        profissionalId: p.id,
      };
      // Março repete; abril já tem o salário (veio pela prévia das fixas).
      await tx.despesa.create({ data: { ...base, competencia: dia('2027-03-01'), repetir: true } });
      await tx.despesa.create({ data: { ...base, competencia: dia('2027-04-01') } });
      return p.id;
    });
    expect(await repetirDespesasDoMes(prisma, conta, '2027-04-01')).toBe(0);
    const abril = await naMinhaConta((tx) =>
      tx.despesa.findMany({ where: { profissionalId, competencia: dia('2027-04-01') } }),
    );
    expect(abril).toHaveLength(1);
    // Sem o de abril, a cópia vem e leva o barbeiro.
    await naMinhaConta((tx) => tx.despesa.delete({ where: { id: abril[0]!.id } }));
    expect(await repetirDespesasDoMes(prisma, conta, '2027-04-02')).toBe(1);
    const copia = await naMinhaConta((tx) =>
      tx.despesa.findFirst({
        where: { competencia: dia('2027-04-01'), descricao: 'Salário: Saulo' },
      }),
    );
    expect(copia?.profissionalId).toBe(profissionalId);
  });
});
