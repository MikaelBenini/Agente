// Indique e ganhe: o gatilho da fatura cria a comissão de quem indicou, nos dois caminhos de
// pagamento. 20% nos 12 primeiros meses, liberada em 30 dias; estorno cancela; quem é cliente e
// troca por meses ganha 1 mês por indicada, só no primeiro pagamento dela.
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarPrisma, naConta, type PrismaClient } from '../src/index.js';

const envDaRaiz = new URL('../../../.env', import.meta.url);
if (existsSync(envDaRaiz)) process.loadEnvFile(envDaRaiz);

let app: PrismaClient;
let plataforma: PrismaClient;
const sufixo = randomUUID()
  .slice(0, 6)
  .toUpperCase()
  .replace(/[^A-Z0-9]/g, 'A');
const codigoPix = `PIX${sufixo}`;
const codigoMes = `MES${sufixo}`;
const contas: string[] = [];
const d = (iso: string) => new Date(`${iso}T12:00:00Z`);

async function contaIndicada(codigo: string) {
  const id = randomUUID();
  contas.push(id);
  await naConta(app, id, (tx) =>
    tx.conta.create({ data: { id, nome: `Indicada ${id.slice(0, 4)}`, indicadoPor: codigo } }),
  );
  return id;
}

async function fatura(contaId: string, pagaEm: string, valor = 14990) {
  return naConta(app, contaId, (tx) =>
    tx.faturaAssinatura.create({
      data: {
        plano: 'pro',
        ciclo: 'mensal',
        valor,
        vencimento: d(pagaEm),
        periodoInicio: d(pagaEm),
        periodoFim: d(pagaEm),
        status: 'paga',
        origem: 'manual',
        forma: 'pix',
        pagaEm: d(pagaEm),
      },
    }),
  );
}

beforeAll(async () => {
  app = criarPrisma();
  plataforma = criarPrisma(process.env.DATABASE_PLATAFORMA_URL);
  const cliente = randomUUID();
  contas.push(cliente);
  await naConta(app, cliente, (tx) => tx.conta.create({ data: { id: cliente, nome: 'Cliente' } }));
  await plataforma.indicador.createMany({
    data: [
      {
        nome: 'Amigo',
        email: `amigo-${sufixo}@e2e.dev`,
        codigo: codigoPix,
        tokenHash: randomUUID(),
      },
      {
        nome: 'Dono',
        email: `dono-${sufixo}@e2e.dev`,
        codigo: codigoMes,
        tokenHash: randomUUID(),
        contaId: cliente,
        recebe: 'meses',
      },
    ],
  });
});

afterAll(async () => {
  await plataforma.indicador.deleteMany({ where: { codigo: { in: [codigoPix, codigoMes] } } });
  for (const id of contas) await naConta(app, id, (tx) => tx.conta.deleteMany({ where: { id } }));
  await app.$disconnect();
  await plataforma.$disconnect();
});

describe('indique e ganhe no banco', () => {
  it('Pix: 20% da mensalidade, liberado em 30 dias, só nos 12 primeiros meses', async () => {
    const conta = await contaIndicada(codigoPix);
    const primeira = await fatura(conta, '2026-01-10');
    await fatura(conta, '2026-12-10');
    await fatura(conta, '2027-01-10');
    const c = await plataforma.comissaoIndicacao.findMany({
      where: { contaId: conta },
      orderBy: { liberaEm: 'asc' },
    });
    expect(c.map((x) => x.valor)).toEqual([2998, 2998]);
    expect(c[0]!.tipo).toBe('pix');
    expect(c[0]!.liberaEm.toISOString().slice(0, 10)).toBe('2026-02-09');

    // Estornada antes de pagar a comissão: cancela.
    await naConta(app, conta, (tx) =>
      tx.faturaAssinatura.update({ where: { id: primeira.id }, data: { status: 'cancelada' } }),
    );
    const cancelada = await plataforma.comissaoIndicacao.findUnique({
      where: { faturaId: primeira.id },
    });
    expect(cancelada?.canceladaEm).not.toBeNull();
  });

  it('meses grátis: 1 por indicada, só no primeiro pagamento; sem código, nada', async () => {
    const conta = await contaIndicada(codigoMes);
    await fatura(conta, '2026-03-01');
    await fatura(conta, '2026-04-01');
    const c = await plataforma.comissaoIndicacao.findMany({ where: { contaId: conta } });
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ tipo: 'mes', valor: 0 });

    const sem = await contaIndicada('NAOEXISTE');
    await fatura(sem, '2026-03-01');
    expect(await plataforma.comissaoIndicacao.count({ where: { contaId: sem } })).toBe(0);
  });

  it('a aplicação das barbearias não lê as tabelas do indique e ganhe', async () => {
    await expect(app.indicador.count()).rejects.toThrow();
  });
});
