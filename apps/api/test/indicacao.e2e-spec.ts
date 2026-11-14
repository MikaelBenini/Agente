// Indique e ganhe (regras de 14/11): qualquer pessoa gera o link; a barbearia que entra por ele
// ganha 30 dias de teste e fica marcada; o painel abre pelo link secreto; o dono entra pela conta.
import type { INestApplication } from '@nestjs/common';
import { criarPrisma, naConta, type PrismaClient } from '@pente-fino/db';
import type { PainelIndicador } from '@pente-fino/shared';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { como, criarApp, criarCenario, type Cenario } from './ajudantes.js';

let app: INestApplication<App>;
let plataforma: PrismaClient;
let prisma: PrismaClient;
let a: Cenario;
const sufixo = randomUUID().slice(0, 8);
const http = () => request(app.getHttpServer());
const contasCriadas: string[] = [];
const emails: string[] = [];

beforeAll(async () => {
  app = await criarApp();
  a = await criarCenario();
  prisma = criarPrisma();
  plataforma = criarPrisma(process.env.DATABASE_PLATAFORMA_URL);
});

afterAll(async () => {
  await plataforma.indicador.deleteMany({
    where: { OR: [{ email: { in: emails } }, { contaId: a.contaId }] },
  });
  for (const id of contasCriadas)
    await naConta(prisma, id, (tx) => tx.conta.deleteMany({ where: { id } }));
  await plataforma.$disconnect();
  await prisma.$disconnect();
  await a.remover();
  await app.close();
});

describe('indique e ganhe', () => {
  it('qualquer pessoa gera o link; a indicada ganha 30 dias; o painel abre pelo link secreto', async () => {
    const email = `amigo-${sufixo}@e2e.pentefino.dev`;
    emails.push(email);
    await http()
      .post('/publico/indicadores')
      .send({ nome: 'Amigo', email, cpf: '111.111.111-11', chavePix: 'x' })
      .expect(400);
    const r = (
      await http()
        .post('/publico/indicadores')
        .send({ nome: 'Amigo do Barbeiro', email, cpf: '529.982.247-25', chavePix: email })
        .expect(201)
    ).body as { codigo: string; link: string; token: string };
    expect(r.link).toMatch(`/cadastro?indicacao=${r.codigo}`);
    await http()
      .post('/publico/indicadores')
      .send({ nome: 'De novo', email, cpf: '529.982.247-25', chavePix: email })
      .expect(409);
    expect((await http().get(`/publico/indicadores/codigo/${r.codigo}`).expect(200)).body).toEqual({
      valido: true,
    });
    expect((await http().get('/publico/indicadores/codigo/NAOEXISTE').expect(200)).body).toEqual({
      valido: false,
    });

    // A barbearia indicada se cadastra pelo link.
    const cadastro = await http()
      .post('/publico/contas')
      .send({
        barbearia: `Indicada ${sufixo}`,
        nome: 'Dona Indicada',
        email: `indicada-${sufixo}@e2e.pentefino.dev`,
        senha: 'senha-forte-123',
        aceite: true,
        abertoEm: Date.now() - 10_000,
        indicacao: r.codigo.toLowerCase(),
      })
      .expect(201);
    const contaId = (cadastro.body as { conta?: { id: string } }).conta?.id;
    const conta = await plataforma.$queryRaw<{ indicado_por: string; dias: number }[]>`
      SELECT indicado_por, extract(day from teste_ate - criado_em)::int AS dias
        FROM conta WHERE nome = ${`Indicada ${sufixo}`}`.catch(() => []);
    if (contaId) contasCriadas.push(contaId);
    if (conta[0]) {
      expect(conta[0].indicado_por).toBe(r.codigo);
      expect(conta[0].dias).toBeGreaterThanOrEqual(29);
    }

    await http().get('/publico/indicadores/painel').expect(404);
    const painel = (
      await http().get('/publico/indicadores/painel').set('x-indicador-token', r.token).expect(200)
    ).body as PainelIndicador;
    expect(painel).toMatchObject({ codigo: r.codigo, recebe: 'pix' });
    expect(painel.indicadas.emTeste).toBeGreaterThanOrEqual(1);
  });

  it('o dono entra pela conta e troca o Pix por meses grátis', async () => {
    const dono = await como(app, a.emails.dono);
    expect((await dono.get('/conta/indicacao').expect(200)).body).toBeNull();
    await dono.put('/conta/indicacao', { recebe: 'pix' }).expect(400);
    const p = (await dono.put('/conta/indicacao', { recebe: 'meses' }).expect(200))
      .body as PainelIndicador & { link: string };
    expect(p.recebe).toBe('meses');
    expect(p.link).toMatch(/\/cadastro\?indicacao=/);
    const barbeiro = await como(app, a.emails.barbeiro);
    await barbeiro.get('/conta/indicacao').expect(403);
  });
});
