#!/usr/bin/env node
// Carrega todos os módulos compilados de um app (dist/), como o Node faz em produção, sem
// subir o app (o main.js fica de fora). Pega o que os testes não pegam: uma dependência que
// muda o jeito de exportar (ex.: web-push 4 sem "export default", que derrubou o worker em
// 16/11/2026 com "does not provide an export named 'default'").
//   node scripts/conferir-modulos.mjs apps/worker/dist apps/api/dist
// Roda no CI de todo PR e dentro das imagens de produção, antes do deploy.
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const pastas = process.argv.slice(2);
if (pastas.length === 0) {
  console.error('Uso: node scripts/conferir-modulos.mjs <pasta dist> [...]');
  process.exit(2);
}

function arquivos(pasta) {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return nome.endsWith('.js') && nome !== 'main.js' ? [caminho] : [];
  });
}

let falhas = 0;
for (const pasta of pastas) {
  const lista = arquivos(resolve(pasta));
  for (const arquivo of lista) {
    try {
      await import(pathToFileURL(arquivo).href);
    } catch (e) {
      falhas++;
      console.error(`Falhou ao carregar ${arquivo}:\n  ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`${pasta}: ${lista.length} módulos conferidos`);
}
if (falhas) {
  console.error(`${falhas} módulo(s) não carregam: o app cairia ao iniciar.`);
  process.exit(1);
}
