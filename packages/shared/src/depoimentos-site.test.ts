import { describe, expect, it } from 'vitest';
import { depoimentoSchema, nomeDoTituloInstagram, perfilDoInstagram } from './depoimentos-site.js';

describe('depoimentos do site', () => {
  it('lê o perfil do link, do @ ou do nome', () => {
    expect(perfilDoInstagram('https://www.instagram.com/nossopentefino/')).toBe('nossopentefino');
    expect(perfilDoInstagram('instagram.com/Barbearia.Navalha?igsh=abc')).toBe('barbearia.navalha');
    expect(perfilDoInstagram('@corte_fino')).toBe('corte_fino');
    expect(perfilDoInstagram('https://www.instagram.com/p/Cx123/')).toBeNull();
    expect(perfilDoInstagram('não é um perfil')).toBeNull();
  });

  it('nome a partir do título do Instagram', () => {
    expect(
      nomeDoTituloInstagram('Barbearia Navalha (@navalha) • Instagram photos and videos'),
    ).toBe('Barbearia Navalha');
    expect(nomeDoTituloInstagram('Instagram')).toBeNull();
    expect(nomeDoTituloInstagram(null)).toBeNull();
  });

  it('pede o perfil, o nome, o texto e a data', () => {
    const r = depoimentoSchema.safeParse({
      instagram: '@navalha',
      nome: 'Rafael',
      texto: 'Agora sei quanto sobra no fim do mês.',
      data: '2026-11-14',
    });
    expect(r.success && r.data).toMatchObject({ instagram: 'navalha', ativo: true, quem: '' });
    expect(
      depoimentoSchema.safeParse({ instagram: 'x y', nome: 'R', texto: 'curto', data: '' }).success,
    ).toBe(false);
  });
});
