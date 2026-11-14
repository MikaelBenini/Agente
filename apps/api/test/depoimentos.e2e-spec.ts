// Depoimentos da página de vendas (pedido do dono em 14/11): só o admin cadastra; o site lê os
// ativos e a foto. Nos testes o Instagram não é chamado (segue sem foto), e a foto vem por envio.
import type { INestApplication } from '@nestjs/common';
import { hash } from '@node-rs/argon2';
import { criarPrisma, type PrismaClient } from '@pente-fino/db';
import type { DepoimentoNaTela, RespostaEntrarAdmin } from '@pente-fino/shared';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { codigoDoPasso, passoDe } from '../src/admin/totp.js';
import { criarApp } from './ajudantes.js';

let app: INestApplication<App>;
let plataforma: PrismaClient;
const sufixo = randomUUID().slice(0, 8);
const admin = { email: `dep-admin-${sufixo}@pentefino.dev`, senha: 'senha-depoimentos-1' };
const criados: string[] = [];
const http = () => request(app.getHttpServer());

async function entrar() {
  const r1 = (await http().post('/admin/auth/entrar').send(admin).expect(200))
    .body as RespostaEntrarAdmin;
  if (r1.etapa !== 'configurar') throw new Error('esperava configurar');
  const r2 = (
    await http()
      .post('/admin/auth/entrar')
      .send({ ...admin, codigo: codigoDoPasso(r1.segredo, passoDe(new Date())) })
      .expect(200)
  ).body as RespostaEntrarAdmin;
  if (r2.etapa !== 'pronto') throw new Error('esperava pronto');
  return r2.token;
}

beforeAll(async () => {
  app = await criarApp();
  plataforma = criarPrisma(process.env.DATABASE_PLATAFORMA_URL);
  await plataforma.usuarioPlataforma.create({
    data: { email: admin.email, nome: 'Ana', papel: 'admin', senhaHash: await hash(admin.senha) },
  });
});

afterAll(async () => {
  await plataforma.depoimentoSite.deleteMany({ where: { id: { in: criados } } });
  await plataforma.usuarioPlataforma.updateMany({
    where: { email: admin.email },
    data: { ativo: false },
  });
  await plataforma.$disconnect();
  await app.close();
});

describe('depoimentos da página de vendas', () => {
  it('admin cadastra pelo link do Instagram, envia a foto, esconde; o site vê só os ativos', async () => {
    const token = await entrar();
    const auth = { authorization: `Bearer ${token}` };
    await http().post('/admin/depoimentos').send({}).expect(401);
    await http()
      .post('/admin/depoimentos')
      .set(auth)
      .send({ instagram: 'não é perfil', nome: 'R', texto: 'curto', data: '2026-11-14' })
      .expect(400);
    const d = (
      await http()
        .post('/admin/depoimentos')
        .set(auth)
        .send({
          instagram: `https://www.instagram.com/barbearia_${sufixo}/`,
          nome: 'Rafael',
          quem: 'Barbearia Navalha, Cascavel (PR)',
          texto: 'Agora sei quanto sobra no fim do mês.',
          data: '2026-11-14',
        })
        .expect(201)
    ).body as DepoimentoNaTela;
    criados.push(d.id);
    expect(d).toMatchObject({ instagram: `barbearia_${sufixo}`, ativo: true, foto: null });

    const png = await sharp({
      create: { width: 40, height: 40, channels: 3, background: '#f5d33b' },
    })
      .png()
      .toBuffer();
    const comFoto = (
      await http()
        .put(`/admin/depoimentos/${d.id}/foto`)
        .set(auth)
        .send({ tipo: 'image/png', base64: `data:image/png;base64,${png.toString('base64')}` })
        .expect(200)
    ).body as DepoimentoNaTela;
    expect(comFoto.foto).toMatch(`/api/publico/depoimentos/${d.id}/foto`);

    const site = (await http().get('/publico/depoimentos').expect(200)).body as DepoimentoNaTela[];
    expect(site.some((x) => x.id === d.id)).toBe(true);
    const foto = await http().get(`/publico/depoimentos/${d.id}/foto`).expect(200);
    expect(foto.headers['content-type']).toBe('image/webp');

    await http()
      .put(`/admin/depoimentos/${d.id}`)
      .set(auth)
      .send({ ...d, ativo: false })
      .expect(200);
    const depois = (await http().get('/publico/depoimentos').expect(200))
      .body as DepoimentoNaTela[];
    expect(depois.some((x) => x.id === d.id)).toBe(false);
    await http().get(`/publico/depoimentos/${d.id}/foto`).expect(404);
  });
});
