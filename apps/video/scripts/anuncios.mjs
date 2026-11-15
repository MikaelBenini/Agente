// Gera os anúncios de 15 s (9:16 e quadrado) em anuncios/, com a trilha própria dos anúncios.
//   npm run anuncios
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';

const raiz = new URL('..', import.meta.url).pathname;
const fonte = readFileSync(new URL('../src/Anuncio.tsx', import.meta.url), 'utf8');
const bloco = fonte.slice(
  fonte.indexOf('export const ANUNCIOS'),
  fonte.indexOf('function TextoTopo'),
);
const funcoes = [...bloco.matchAll(/^  (\w+): \{$/gm)].map((m) => m[1]);
const rodar = (args) => execFileSync('npx', args, { cwd: raiz, stdio: 'inherit' });

execFileSync('node', ['scripts/trilha.mjs', 'ritmo-anuncio.json', 'trilha-anuncio'], {
  cwd: raiz,
  stdio: 'inherit',
});
mkdirSync(`${raiz}anuncios`, { recursive: true });
for (const funcao of funcoes)
  for (const formato of ['vertical', 'quadrado']) {
    const nome = `${funcao}-${formato}`;
    const mestre = `out/anuncio-${nome}.mp4`;
    rodar([
      'remotion',
      'render',
      `Anuncio-${nome}`,
      mestre,
      '--codec=h264',
      '--crf=18',
      '--log=error',
    ]);
    // Para as redes: H.264 com crf 22 e AAC, início rápido (as redes recomprimem de novo).
    rodar([
      'remotion',
      'ffmpeg',
      '-y',
      '-loglevel',
      'error',
      '-i',
      mestre,
      '-c:v',
      'libx264',
      '-crf',
      '22',
      '-preset',
      'slow',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      `anuncios/${nome}.mp4`,
    ]);
    rmSync(`${raiz}${mestre}`);
    console.log(`anuncios/${nome}.mp4`);
  }
