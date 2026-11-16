import { describe, expect, it } from 'vitest';
import { temVerificacaoGoogle } from './configuracao-sistema.js';
import { INDEXNOW_CHAVE, pedidoIndexNow } from './indexnow.js';

describe('IndexNow (checklist de SEO de 16/11/2026)', () => {
  it('em produção, avisa só os endereços do próprio domínio, com a chave publicada', () => {
    expect(
      pedidoIndexNow('https://seupentefino.com.br', [
        'https://seupentefino.com.br/b/navalha',
        'https://seupentefino.com.br/b/navalha',
        'https://outro.com/x',
        'lixo',
      ]),
    ).toEqual({
      host: 'seupentefino.com.br',
      key: INDEXNOW_CHAVE,
      keyLocation: `https://seupentefino.com.br/${INDEXNOW_CHAVE}.txt`,
      urlList: ['https://seupentefino.com.br/b/navalha'],
    });
  });

  it('fora de produção (http, localhost, IP) ou sem endereço do site: nada sai', () => {
    expect(pedidoIndexNow('http://localhost:3000', ['http://localhost:3000/x'])).toBeNull();
    expect(pedidoIndexNow('https://127.0.0.1', ['https://127.0.0.1/x'])).toBeNull();
    expect(pedidoIndexNow('https://seupentefino.com.br', ['https://outro.com/x'])).toBeNull();
    expect(pedidoIndexNow('nada', [])).toBeNull();
  });
});

describe('Search Console verificado (sugestão de 16/11/2026)', () => {
  it('lê o TXT do Google entre os registros do domínio', () => {
    expect(temVerificacaoGoogle([['v=spf1 -all'], ['google-site-verification=abc']])).toBe(true);
    // O DNS pode partir o TXT em pedaços.
    expect(temVerificacaoGoogle([['google-site-', 'verification=abc']])).toBe(true);
    expect(temVerificacaoGoogle([['v=spf1 -all']])).toBe(false);
    expect(temVerificacaoGoogle([])).toBe(false);
  });
});
