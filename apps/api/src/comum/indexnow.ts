import { Logger } from '@nestjs/common';
import { INDEXNOW_URL, pedidoIndexNow } from '@pente-fino/shared';

const logger = new Logger('IndexNow');

/**
 * Avisa os buscadores (Bing, Yandex e outros, pelo IndexNow) que estes endereços mudaram
 * (checklist de SEO do dono em 16/11/2026). Fora de produção não faz nada; falha só vai para o
 * log, nunca atrapalha quem publicou.
 */
export async function avisarBuscadores(
  urlSite: string,
  urls: readonly string[],
  buscar: typeof fetch = fetch,
): Promise<boolean> {
  const corpo = pedidoIndexNow(urlSite, urls);
  if (!corpo) return false;
  try {
    const r = await buscar(INDEXNOW_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(5_000),
    });
    if (!r.ok)
      logger.warn(`IndexNow respondeu ${r.status} para ${corpo.urlList.length} endereço(s)`);
    return r.ok;
  } catch (e) {
    logger.warn(`IndexNow não respondeu: ${(e as Error).message}`);
    return false;
  }
}
