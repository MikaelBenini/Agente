import { describe, expect, it } from 'vitest';
import { agendaNova, PASSOS_AGENDA } from './agendar-bot.js';
import { MENU_BOT_PADRAO } from './bot.js';
import {
  horarioBotSchema,
  mensagensBotSchema,
  menuBotSchema,
  simularBotSchema,
} from './esquemas-bot.js';

describe('esquemas do bot', () => {
  it('aceita o menu padrão e submenus', () => {
    expect(menuBotSchema.safeParse(MENU_BOT_PADRAO).success).toBe(true);
    const comSub = structuredClone(MENU_BOT_PADRAO);
    comSub.menu.opcoes[0]!.submenu = { texto: 'Qual?', opcoes: [] };
    expect(menuBotSchema.safeParse(comSub).success).toBe(true);
  });

  it('recusa ação inventada e opção demais', () => {
    const ruim = structuredClone(MENU_BOT_PADRAO) as unknown as {
      menu: { opcoes: { acao: string }[] };
    };
    ruim.menu.opcoes[0]!.acao = 'apagar_tudo';
    expect(menuBotSchema.safeParse(ruim).success).toBe(false);
  });

  it('mensagem com variável que não existe é recusada', () => {
    expect(
      mensagensBotSchema.safeParse({ mensagens: { boas_vindas: 'Oi {cliente}' } }).success,
    ).toBe(true);
    expect(mensagensBotSchema.safeParse({ mensagens: { boas_vindas: 'Oi {senha}' } }).success).toBe(
      false,
    );
    expect(mensagensBotSchema.safeParse({ mensagens: { inventada: 'x' } }).success).toBe(false);
  });

  it('turno com fim antes do início é recusado; null segue o expediente', () => {
    expect(horarioBotSchema.safeParse({ turnos: null }).success).toBe(true);
    expect(
      horarioBotSchema.safeParse({ turnos: [{ diaSemana: 1, inicioMin: 600, fimMin: 540 }] })
        .success,
    ).toBe(false);
  });

  it('simulação tem padrões', () => {
    const r = simularBotSchema.parse({
      unidadeId: '019a4b2c-0000-7000-8000-000000000001',
      entrada: 'oi',
      sessao: null,
    });
    expect(r).toMatchObject({ versao: 'rascunho', cliente: null, foraDoHorario: false });
  });

  // O painel devolve a sessão a cada mensagem: todo passo do agendamento tem de voltar aceito
  // (antes, "Por aqui, na conversa" dava erro no simulador por causa do passo "canal").
  it('simulação aceita a sessão em qualquer passo do agendamento', () => {
    for (const passo of PASSOS_AGENDA) {
      const r = simularBotSchema.safeParse({
        unidadeId: '019a4b2c-0000-7000-8000-000000000001',
        entrada: '1',
        sessao: {
          caminho: [],
          ultimaEm: new Date().toISOString(),
          comAtendente: false,
          agenda: { ...agendaNova(), passo, temMais: true },
        },
      });
      expect(r.success, passo).toBe(true);
      expect(r.data?.sessao?.agenda?.temMais).toBe(true);
    }
  });
});
