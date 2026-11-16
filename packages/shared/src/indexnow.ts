// IndexNow (checklist de SEO do dono em 16/11/2026): avisa Bing, Yandex e outros buscadores na
// hora em que uma página nova entra no ar. A chave é pública por desenho: o arquivo
// /<chave>.txt no site prova que o aviso veio do dono do domínio.
export const INDEXNOW_CHAVE = '103d8c06a8dbe0c36e3c472d93904fbc';
export const INDEXNOW_URL = 'https://api.indexnow.org/indexnow';

/**
 * O aviso para os endereços do site, ou null quando não se deve avisar: fora de produção
 * (http, localhost, IP) nada sai; só endereços do próprio domínio entram; no máximo 10.000.
 */
export function pedidoIndexNow(
  urlSite: string,
  urls: readonly string[],
): { host: string; key: string; keyLocation: string; urlList: string[] } | null {
  let base: URL;
  try {
    base = new URL(urlSite);
  } catch {
    return null;
  }
  if (base.protocol !== 'https:' || /^(localhost|127\.|\d+\.\d+\.\d+\.\d+$)/.test(base.hostname))
    return null;
  const doSite = [
    ...new Set(
      urls.filter((u) => {
        try {
          return new URL(u).host === base.host;
        } catch {
          return false;
        }
      }),
    ),
  ].slice(0, 10_000);
  if (doSite.length === 0) return null;
  return {
    host: base.host,
    key: INDEXNOW_CHAVE,
    keyLocation: `${base.origin}/${INDEXNOW_CHAVE}.txt`,
    urlList: doSite,
  };
}
