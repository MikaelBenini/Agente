// Lista do dono em 16/11/2026: menu e mensagens por unidade (com o padrão da barbearia), avisos
// antes de publicar, diagnóstico do simulador, preço de um serviço, pedido numa frase, VOLTAR e
// MENU previsíveis e as mensagens automáticas de quem vem de anúncio.
import type { INestApplication } from '@nestjs/common';
import {
  dataLocal,
  MENU_BOT_PADRAO,
  type EstadoBot,
  type FluxoAnuncio,
  type MenuBot,
  type RespostaSimulacao,
} from '@pente-fino/shared';
import type { App } from 'supertest/types.js';
import { como, criarApp, criarCenario, type Cenario } from './ajudantes.js';

let app: INestApplication<App>;
let a: Cenario;
type Cliente = Awaited<ReturnType<typeof como>>;
let dono: Cliente;
const hoje = dataLocal(new Date());

beforeAll(async () => {
  app = await criarApp();
  a = await criarCenario();
  dono = await como(app, a.emails.dono);
  const corte = (
    await dono
      .post('/servicos', {
        nome: 'Corte',
        duracaoMin: 30,
        custoProduto: 0,
        ehExtra: false,
        pesoAtendimento: 1,
      })
      .expect(201)
  ).body.id;
  await dono
    .post('/precos', {
      vigenciaInicio: hoje,
      precos: [{ servicoId: corte, unidadeId: a.unidadeA, valor: 4500 }],
    })
    .expect(201);
  const usuarios = (await dono.get('/usuarios')).body as { id: string; email: string }[];
  await dono
    .post('/profissionais', {
      unidadeId: a.unidadeA,
      usuarioId: usuarios.find((u) => u.email === a.emails.barbeiro)!.id,
      dataEntrada: hoje,
      comissaoServico: { percentualBp: 4000, valorFixo: null },
      comissaoProduto: { percentualBp: 1000, valorFixo: null },
    })
    .expect(201);
});

afterAll(async () => {
  await a.remover();
  await app.close();
});

const conversa = (unidadeId: string, extra: object = {}) => {
  let sessao: unknown = null;
  return async (entrada: string, mais: object = {}) => {
    const r = (
      await dono
        .post('/bot/simular', {
          unidadeId,
          entrada,
          sessao,
          versao: 'publicado',
          ...extra,
          ...mais,
        })
        .expect(200)
    ).body as RespostaSimulacao;
    sessao = r.sessao;
    return r;
  };
};

describe('menu e mensagens por unidade, com o padrão da barbearia', () => {
  it('a unidade personaliza e volta ao padrão; a outra continua com o padrão', async () => {
    const B = a.unidadeB;
    let eB = (await dono.get(`/bot?unidadeId=${B}`).expect(200)).body as EstadoBot;
    expect(eB.escopo).toMatchObject({ unidadeId: B, menuProprio: false, mensagensProprias: [] });
    expect(eB.publicado.menu).toEqual(MENU_BOT_PADRAO);

    const proprio: MenuBot = structuredClone(MENU_BOT_PADRAO) as MenuBot;
    proprio.menu.texto = 'Menu só da B';
    await dono.put(`/bot/menu?unidadeId=${B}`, proprio).expect(200);
    await dono.post(`/bot/menu/publicar?unidadeId=${B}`, {}).expect(204);
    await dono
      .put(`/bot/mensagens?unidadeId=${B}`, { mensagens: { boas_vindas: 'Oi, aqui é a B!' } })
      .expect(200);

    eB = (await dono.get(`/bot?unidadeId=${B}`).expect(200)).body as EstadoBot;
    expect(eB.escopo).toMatchObject({ menuProprio: true, mensagensProprias: ['boas_vindas'] });
    expect(eB.publicado.menu.menu.texto).toBe('Menu só da B');
    // O padrão não mudou.
    const padrao = (await dono.get('/bot').expect(200)).body as EstadoBot;
    expect(padrao.publicado.menu).toEqual(MENU_BOT_PADRAO);

    const naB = await conversa(B)('oi');
    expect(naB.respostas.join('\n')).toContain('Oi, aqui é a B!');
    expect(naB.respostas.join('\n')).toContain('Menu só da B');
    expect(naB.diagnostico).toMatchObject({ versao: 'publicado', deQuem: 'unidade' });
    const naA = await conversa(a.unidadeA)('oi');
    expect(naA.respostas.join('\n')).not.toContain('Oi, aqui é a B!');
    expect(naA.diagnostico.deQuem).toBe('padrao');

    await dono.delete(`/bot/unidade/${B}/personalizacao`).expect(204);
    eB = (await dono.get(`/bot?unidadeId=${B}`).expect(200)).body as EstadoBot;
    expect(eB.escopo).toMatchObject({ menuProprio: false, mensagensProprias: [] });
    expect(eB.publicado.menu).toEqual(MENU_BOT_PADRAO);
  });

  it('avisa o que faz o bot falhar e o simulador explica quando não há rascunho', async () => {
    const e = (await dono.get('/bot').expect(200)).body as EstadoBot;
    const daB = e.avisos.filter((x) => x.unidadeId === a.unidadeB).map((x) => x.mensagem);
    expect(daB.some((m) => m.startsWith('Sem número de WhatsApp conectado'))).toBe(true);
    expect(daB.some((m) => m.startsWith('Nenhum serviço com preço'))).toBe(true);
    const r = await conversa(a.unidadeA, { versao: 'rascunho' })('oi');
    expect(r.diagnostico.aviso).toBe('Não há rascunho: este teste usou o menu publicado.');
    expect(r.diagnostico.opcoes.length).toBe(MENU_BOT_PADRAO.menu.opcoes.length);
  });
});

describe('bot mais esperto', () => {
  it('"quanto é o corte?" responde só o corte e oferece marcar', async () => {
    const r = await conversa(a.unidadeA)('Quanto é o corte?');
    expect(r.respostas.join('\n')).toContain('Corte custa R$ 45,00 e leva 30 min. Quer marcar?');
  });

  it('"quero cortar amanhã às 10h" pula para o horário; VOLTAR volta um passo e MENU vai ao início', async () => {
    const fala = conversa(a.unidadeA);
    const r1 = (await fala('quero cortar amanhã às 10h')).respostas.join('\n');
    expect(r1).toContain('Anotei: Corte');
    // Livre: confirmação; ocupado ou fora do expediente: os mais perto, ou outros dias.
    expect(r1).toMatch(/Confere se está certo|mais perto|Estes dias têm|Horários livres/);
    const r2 = (await fala('voltar')).respostas.join('\n');
    expect(r2).not.toContain('Como posso ajudar');
    const r3 = (await fala('menu')).respostas.join('\n');
    expect(r3).toContain(MENU_BOT_PADRAO.menu.opcoes[0]!.rotulo);
  });
});

describe('mensagens automáticas de quem vem de anúncio', () => {
  it('o dono configura; quem chega pelo anúncio recebe a sequência e passa para a equipe', async () => {
    const fluxo: FluxoAnuncio = {
      ativo: true,
      frases: ['Olá! Quero saber mais.'],
      etapas: ['Que bom que veio pelo anúncio! Qual serviço?', 'Qual dia fica melhor?'],
      final: 'Já passei para a equipe.',
    };
    await dono.put('/bot/anuncio', fluxo).expect(200);
    expect((await dono.get('/bot/anuncio').expect(200)).body).toEqual(fluxo);

    const fala = conversa(a.unidadeA, { cliente: null });
    expect((await fala('oi', { doAnuncio: true })).respostas).toEqual([
      'Que bom que veio pelo anúncio! Qual serviço?',
    ]);
    expect((await fala('corte')).respostas).toEqual(['Qual dia fica melhor?']);
    const fim = await fala('sábado');
    expect(fim.respostas).toEqual(['Já passei para a equipe.']);
    expect(fim.acao).toBe('falar_com_atendente');
    expect(fim.sessao.respostasAnuncio).toEqual(['corte', 'sábado']);

    // A frase pronta do anúncio também começa o fluxo; mensagem comum segue o menu.
    expect((await conversa(a.unidadeA)('Olá! Quero saber mais.')).respostas[0]).toBe(
      'Que bom que veio pelo anúncio! Qual serviço?',
    );
    expect((await conversa(a.unidadeA)('oi')).respostas.join('\n')).not.toContain('anúncio');
    // Etapas demais: recusa.
    await dono
      .put('/bot/anuncio', { ...fluxo, etapas: ['1', '2', '3', '4', '5', '6'] })
      .expect(400);
  });
});
