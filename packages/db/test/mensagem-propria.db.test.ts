// Pedido do dono em 16/11/2026: "se respondo o cliente pelo meu zap, o bot continua na conversa e
// vira bagunça". O que sai do próprio número é eco do bot (mesmo id ou mesmo texto há pouco) ou a
// equipe pelo celular, que tira o bot da conversa.
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import type { SessaoBot } from '@pente-fino/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  criarPrisma,
  instanciaDaUnidade,
  naConta,
  registrarMensagemPropria,
  type PrismaClient,
} from '../src/index.js';

const envDaRaiz = new URL('../../../.env', import.meta.url);
if (existsSync(envDaRaiz)) process.loadEnvFile(envDaRaiz);

let prisma: PrismaClient;
const conta = randomUUID();
let unidadeId = '';
let instancia = '';
const telefone = '5511977771234';
const evento = (idExterno: string, texto: string) => ({
  tipo: 'propria' as const,
  instancia,
  idExterno,
  telefone,
  texto,
  recebidaEm: new Date().toISOString(),
});

beforeAll(async () => {
  prisma = criarPrisma();
  await naConta(prisma, conta, async (tx) => {
    await tx.conta.create({ data: { id: conta, nome: 'Barbearia Eco', plano: 'pro' } });
    const u = await tx.unidade.create({ data: { nome: 'Centro' } });
    unidadeId = u.id;
    instancia = instanciaDaUnidade(u.id);
    await tx.botConexao.create({ data: { unidadeId, instancia, status: 'conectado' } });
    // O bot respondeu há pouco, e a sessão está no menu.
    await tx.mensagem.create({
      data: {
        unidadeId,
        telefone,
        direcao: 'saida',
        texto: 'Como posso ajudar?',
        status: 'enviada',
        idExterno: 'ID-DO-BOT',
      },
    });
    await tx.botSessao.create({
      data: {
        unidadeId,
        telefone,
        sessao: { caminho: [], comAtendente: false, ultimaEm: new Date().toISOString() },
      },
    });
  });
});

afterAll(async () => {
  await naConta(prisma, conta, (tx) => tx.conta.deleteMany({ where: { id: conta } }));
  await prisma.$disconnect();
});

describe('mensagem que saiu do próprio número', () => {
  it('o eco do bot (mesmo id, ou o mesmo texto antes de gravar o id) não muda nada', async () => {
    expect(await registrarMensagemPropria(prisma, evento('ID-DO-BOT', 'Como posso ajudar?'))).toBe(
      'eco',
    );
    expect(await registrarMensagemPropria(prisma, evento('OUTRO-ID', 'Como posso ajudar?'))).toBe(
      'eco',
    );
    const s = await naConta(prisma, conta, (tx) =>
      tx.botSessao.findFirstOrThrow({ where: { unidadeId, telefone } }),
    );
    expect((s.sessao as unknown as SessaoBot).comAtendente).toBe(false);
  });

  it('a equipe respondendo pelo celular entra no histórico e tira o bot da conversa', async () => {
    expect(
      await registrarMensagemPropria(prisma, evento('ID-DO-CELULAR', 'Oi! Aqui é o Diego, já te encaixo.')),
    ).toBe('equipe');
    const { s, m } = await naConta(prisma, conta, async (tx) => ({
      s: await tx.botSessao.findFirstOrThrow({ where: { unidadeId, telefone } }),
      m: await tx.mensagem.findFirst({ where: { idExterno: 'ID-DO-CELULAR' } }),
    }));
    expect((s.sessao as unknown as SessaoBot).comAtendente).toBe(true);
    expect(s.atendenteDesde).toBeNull();
    expect(m).toMatchObject({ direcao: 'saida', status: 'enviada' });
    // A mesma mensagem entregue de novo é eco (já está gravada).
    expect(
      await registrarMensagemPropria(prisma, evento('ID-DO-CELULAR', 'Oi! Aqui é o Diego, já te encaixo.')),
    ).toBe('eco');
  });

  it('instância desconhecida: nada a fazer', async () => {
    expect(
      await registrarMensagemPropria(prisma, { ...evento('X', 'oi'), instancia: 'pf-nao-existe' }),
    ).toBe('sem_conexao');
  });
});
