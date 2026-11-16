#!/usr/bin/env node
// Depois do deploy, avisa os buscadores (IndexNow: Bing, Yandex e outros) de todas as páginas do
// sitemap (checklist de SEO do dono em 16/11/2026). A chave é a do arquivo publicado em
// apps/web/public/<chave>.txt (a mesma de INDEXNOW_CHAVE em packages/shared).
//   node scripts/indexnow.mjs https://seupentefino.com.br
// Falha não derruba o deploy: só avisa no log.
import { readdirSync, readFileSync } from 'node:fs';

const site = (process.argv[2] ?? '').replace(/\/$/, '');
if (!/^https:\/\//.test(site)) {
  console.log('IndexNow: só em produção (https). Nada enviado.');
  process.exit(0);
}
const pasta = new URL('../apps/web/public/', import.meta.url);
const arquivo = readdirSync(pasta).find((n) => /^[0-9a-f]{32}\.txt$/.test(n));
if (!arquivo) {
  console.log('IndexNow: arquivo da chave não encontrado. Nada enviado.');
  process.exit(0);
}
const chave = readFileSync(new URL(arquivo, pasta), 'utf8').trim();
try {
  const xml = await (
    await fetch(`${site}/sitemap.xml`, { signal: AbortSignal.timeout(15_000) })
  ).text();
  const host = new URL(site).host;
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].trim())
    .filter((u) => new URL(u).host === host)
    .slice(0, 10_000);
  if (urls.length === 0) {
    console.log('IndexNow: sitemap sem endereços. Nada enviado.');
    process.exit(0);
  }
  const r = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key: chave, keyLocation: `${site}/${chave}.txt`, urlList: urls }),
    signal: AbortSignal.timeout(15_000),
  });
  console.log(`IndexNow: ${urls.length} endereço(s) enviados, resposta ${r.status}.`);
} catch (e) {
  console.log(`IndexNow: não deu para avisar (${e.message}). O deploy segue normal.`);
}
