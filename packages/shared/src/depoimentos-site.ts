// Depoimentos da página de vendas (pedido do dono em 14/11): a administração cola o link do
// Instagram de quem falou, o sistema tenta puxar a foto e o nome do perfil, e o dono escreve o
// que a pessoa disse e a data. Na página, passam num carrossel. Só depoimento real e autorizado:
// inventar fere o Código de Defesa do Consumidor e as normas do CONAR.
import { z } from 'zod';

/** "@nossopentefino", "instagram.com/nossopentefino/" ou a URL inteira → "nossopentefino". */
export function perfilDoInstagram(texto: string): string | null {
  const t = texto.trim();
  const m =
    t.match(/instagram\.com\/([A-Za-z0-9._]{1,30})\/?(?:[?#].*)?$/i) ??
    t.match(/^@?([A-Za-z0-9._]{1,30})$/);
  const perfil = m?.[1]?.toLowerCase() ?? null;
  if (!perfil || ['p', 'reel', 'reels', 'stories', 'explore'].includes(perfil)) return null;
  return perfil;
}

export const depoimentoSchema = z.object({
  instagram: z
    .string()
    .transform((t) => perfilDoInstagram(t) ?? '')
    .pipe(z.string().min(1, { error: 'Cole o link ou o @ do Instagram.' })),
  nome: z.string().trim().min(2, { error: 'Informe o nome.' }).max(80),
  /** Ex.: "Dono da Barbearia X, Cascavel (PR)". */
  quem: z.string().trim().max(120).default(''),
  texto: z
    .string()
    .trim()
    .min(10, { error: 'Escreva o que a pessoa disse (pelo menos 10 letras).' })
    .max(600, { error: 'No máximo 600 letras.' }),
  data: z.iso.date({ error: 'Data inválida.' }),
  ativo: z.boolean().default(true),
});
export type DepoimentoEntrada = z.infer<typeof depoimentoSchema>;

/** Foto enviada pela administração (já reduzida no navegador), em base64. */
export const fotoDepoimentoSchema = z.object({
  tipo: z.enum(['image/jpeg', 'image/png', 'image/webp'], { error: 'Use JPG, PNG ou WebP.' }),
  base64: z.string().max(900_000, { error: 'Foto grande demais.' }),
});

export interface DepoimentoNaTela {
  id: string;
  instagram: string;
  nome: string;
  quem: string;
  texto: string;
  data: string;
  ativo: boolean;
  /** Endereço da foto (null = sem foto, mostra a inicial). */
  foto: string | null;
}

/** O que o Instagram devolveu ao buscar o perfil. */
export interface PerfilInstagram {
  perfil: string;
  nome: string | null;
  temFoto: boolean;
}

/** Nome do perfil a partir do og:title do Instagram: "Nome (@perfil) • Instagram..." → "Nome". */
export function nomeDoTituloInstagram(titulo: string | null | undefined): string | null {
  if (!titulo) return null;
  const nome = titulo
    .split(/\s*\(@/)[0]
    ?.split(' • ')[0]
    ?.trim();
  return nome && nome.length >= 2 && !/^instagram$/i.test(nome) ? nome.slice(0, 80) : null;
}
