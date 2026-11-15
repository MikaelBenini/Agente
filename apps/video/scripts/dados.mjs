// Preços e teste grátis do vídeo saem da mesma fonte do site (@pente-fino/shared, já compilado):
// nunca digitados na cena. Rode depois de mudar preço: node scripts/dados.mjs
import { writeFile } from 'node:fs/promises';
import { DIAS_TESTE, formatarMoeda, precoPorMes } from '../../../packages/shared/dist/index.js';

const dados = {
  diasTeste: DIAS_TESTE,
  basicoMensal: formatarMoeda(precoPorMes('basico', 'mensal')),
};
await writeFile(
  new URL('../src/dados.json', import.meta.url),
  `${JSON.stringify(dados, null, 2)}\n`,
);
console.log(dados);
