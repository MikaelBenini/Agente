import { describe, expect, it } from 'vitest';
import { entrarComPasskeySchema, nomeDaPasskey } from './passkey.js';

describe('passkey', () => {
  it('nome do gerenciador pelo AAGUID, só para mostrar', () => {
    expect(nomeDaPasskey('EA9B8D66-4D01-1D21-3CE4-B6B48CB575D4')).toBe(
      'Gerenciador de senhas do Google',
    );
    expect(nomeDaPasskey('00000000-0000-0000-0000-000000000000')).toBe('Passkey');
  });

  it('login aceita a resposta do navegador e recusa o que não é passkey', () => {
    const base = {
      desafioId: '019a4b2c-0000-7000-8000-000000000001',
      resposta: { id: 'abc', rawId: 'abc', type: 'public-key', response: { x: 1 }, extra: true },
    };
    expect(entrarComPasskeySchema.safeParse(base).success).toBe(true);
    expect(
      entrarComPasskeySchema.safeParse({ ...base, resposta: { ...base.resposta, type: 'senha' } })
        .success,
    ).toBe(false);
  });
});
