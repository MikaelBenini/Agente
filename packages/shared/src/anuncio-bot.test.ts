import { describe, expect, it } from 'vitest';
import {
  ehFraseDeAnuncio,
  FLUXO_ANUNCIO_PADRAO,
  lerFluxoAnuncio,
  resumoDoAnuncio,
  responderAnuncio,
  type FluxoAnuncio,
} from './anuncio-bot.js';

const fluxo: FluxoAnuncio = {
  ativo: true,
  frases: ['Olá! Quero saber mais.'],
  etapas: ['Oi, {cliente}! Qual serviço te interessou?', 'Qual dia fica melhor?'],
  final: 'Anotado! Já passei para a equipe.',
};
const agora = new Date('2026-11-16T15:00:00Z');
const depois = (min: number) => new Date(agora.getTime() + min * 60_000);

describe('mensagens automáticas de anúncio (pedido do dono em 16/11/2026)', () => {
  it('desligado ou mensagem comum: segue o bot normal', () => {
    expect(responderAnuncio({ ...fluxo, ativo: false }, null, 'oi', agora, true, null)).toBeNull();
    expect(responderAnuncio(fluxo, null, 'quero marcar', agora, false, null)).toBeNull();
  });

  it('começa pelo anúncio (ou pela frase pronta), pergunta em sequência e passa para a equipe', () => {
    const r1 = responderAnuncio(fluxo, null, 'ola, quero saber mais', agora, false, 'João Silva')!;
    expect(r1).toMatchObject({ comecou: true, paraEquipe: false });
    expect(r1.respostas).toEqual(['Oi, João! Qual serviço te interessou?']);
    const r2 = responderAnuncio(fluxo, r1.sessao, 'Corte e barba', depois(1), false, 'João')!;
    expect(r2.respostas).toEqual(['Qual dia fica melhor?']);
    const r3 = responderAnuncio(fluxo, r2.sessao, 'Sábado de manhã', depois(2), false, 'João')!;
    expect(r3).toMatchObject({ paraEquipe: true, respostas: ['Anotado! Já passei para a equipe.'] });
    expect(r3.sessao.comAtendente).toBe(true);
    expect(r3.sessao.anuncio).toBeUndefined();
    expect(resumoDoAnuncio(r3.sessao.respostasAnuncio!)).toBe(
      'Do anúncio: Corte e barba · Sábado de manhã',
    );
    // Com a equipe, o fluxo não volta nem com a frase do anúncio.
    expect(responderAnuncio(fluxo, r3.sessao, 'Olá! Quero saber mais.', depois(3), true, null)).toBeNull();
  });

  it('sem nome, o {cliente} some sem deixar vírgula sobrando', () => {
    expect(responderAnuncio(fluxo, null, 'x', agora, true, null)!.respostas[0]).toBe(
      'Oi! Qual serviço te interessou?',
    );
  });

  it('frase do anúncio sem diferença de acento e pontuação; o padrão vem desligado', () => {
    expect(ehFraseDeAnuncio(fluxo, 'OLA quero saber mais!!')).toBe(true);
    expect(ehFraseDeAnuncio(fluxo, 'quero saber o preço')).toBe(false);
    expect(lerFluxoAnuncio(null)).toEqual(FLUXO_ANUNCIO_PADRAO);
    expect(FLUXO_ANUNCIO_PADRAO.ativo).toBe(false);
  });
});
