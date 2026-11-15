// Trilha do vídeo, sintetizada aqui mesmo (sem biblioteca de música, sem licença de terceiros).
// Segue as cenas de src/ritmo.json: tique no número subindo, impacto no risco, batida a 120 bpm,
// whoosh em cada transição, subida antes do encerramento e um acorde no fim.
//   node scripts/trilha.mjs                                   →   public/trilha.wav
//   node scripts/trilha.mjs ritmo-anuncio.json trilha-anuncio  →   public/trilha-anuncio.wav
import { readFileSync, writeFileSync } from 'node:fs';

const [arquivoRitmo = 'ritmo.json', nome = 'trilha'] = process.argv.slice(2);
const ritmo = JSON.parse(readFileSync(new URL(`../src/${arquivoRitmo}`, import.meta.url)));
const TAXA = 44100;
const q = (quadros) => quadros / ritmo.fps;
// Início de cada cena, em segundos (a transição sobrepõe o fim de uma ao começo da outra).
const inicios = [];
let t = 0;
for (const s of ritmo.segundos) {
  inicios.push(t);
  t += s - q(ritmo.transicao);
}
const DURACAO = t + q(ritmo.transicao);
const N = Math.ceil(DURACAO * TAXA);
const E = new Float32Array(N);
const D = new Float32Array(N);

// Ruído com semente fixa: a trilha sai igual toda vez.
let semente = 7;
const ruido = () => {
  semente = (semente * 1664525 + 1013904223) >>> 0;
  return semente / 2 ** 31 - 1;
};
const somar = (i, v, pan = 0) => {
  if (i < 0 || i >= N) return;
  E[i] += v * (1 - Math.max(0, pan));
  D[i] += v * (1 + Math.min(0, pan));
};
const nota = (n) => 440 * 2 ** ((n - 69) / 12);

/** Filtro de variável de estado (passa-baixa / passa-banda). */
function filtro() {
  let a = 0;
  let b = 0;
  return (x, freq, ressonancia = 0.5) => {
    const f = 2 * Math.sin((Math.PI * Math.min(freq, TAXA / 6)) / TAXA);
    a += f * b;
    const alta = x - a - ressonancia * b;
    b += f * alta;
    return { baixa: a, banda: b, alta };
  };
}

function bumbo(t0, forca = 1) {
  let fase = 0;
  for (let k = 0; k < 0.45 * TAXA; k++) {
    const s = k / TAXA;
    fase += (2 * Math.PI * (45 + 110 * Math.exp(-s * 28))) / TAXA;
    somar(Math.round(t0 * TAXA) + k, 0.9 * forca * Math.sin(fase) * Math.exp(-s * 7));
  }
}

function chimbal(t0, forca = 1, pan = 0.25) {
  const f = filtro();
  for (let k = 0; k < 0.06 * TAXA; k++)
    somar(
      Math.round(t0 * TAXA) + k,
      0.16 * forca * f(ruido(), 9000, 0.3).alta * Math.exp(-k / TAXA / 0.015),
      pan,
    );
}

function palma(t0) {
  const f = filtro();
  for (let k = 0; k < 0.2 * TAXA; k++) {
    const s = k / TAXA;
    const env = Math.exp(-s * 18) * (s < 0.02 ? (Math.floor(s * 300) % 2 ? 0.6 : 1) : 1);
    somar(Math.round(t0 * TAXA) + k, 0.3 * f(ruido(), 1400, 0.8).banda * env);
  }
}

function baixo(t0, dur, n) {
  const f = filtro();
  const hz = nota(n);
  for (let k = 0; k < dur * TAXA; k++) {
    const s = k / TAXA;
    const serra = 2 * ((s * hz) % 1) - 1;
    const env = Math.min(1, s / 0.005) * Math.exp(-s * 3) * Math.min(1, (dur - s) / 0.02);
    somar(
      Math.round(t0 * TAXA) + k,
      0.32 * env * f(serra, 260 + 900 * Math.exp(-s * 10), 0.6).baixa,
    );
  }
}

function dedilhado(t0, n, forca = 1, pan = 0) {
  const hz = nota(n);
  for (let k = 0; k < 0.5 * TAXA; k++) {
    const s = k / TAXA;
    const v = Math.sin(2 * Math.PI * hz * s) + 0.3 * Math.sin(4 * Math.PI * hz * s);
    somar(
      Math.round(t0 * TAXA) + k,
      0.07 * forca * v * Math.exp(-s * 9) * Math.min(1, s / 0.003),
      pan,
    );
  }
}

function whoosh(t0, dur = 0.55, forca = 1) {
  const fe = filtro();
  const fd = filtro();
  for (let k = 0; k < dur * TAXA; k++) {
    const x = k / (dur * TAXA);
    const env = Math.sin(Math.PI * x) ** 2;
    const freq = 400 + 4200 * Math.sin(Math.PI * x);
    const i = Math.round(t0 * TAXA) + k;
    if (i < 0 || i >= N) continue;
    E[i] += 0.32 * forca * env * fe(ruido(), freq, 0.4).banda * (1.2 - x);
    D[i] += 0.32 * forca * env * fd(ruido(), freq, 0.4).banda * (0.2 + x);
  }
}

function impacto(t0) {
  bumbo(t0, 1.5);
  const f = filtro();
  for (let k = 0; k < 1.4 * TAXA; k++) {
    const s = k / TAXA;
    const v = 0.5 * f(ruido(), 300 + 2500 * Math.exp(-s * 6), 0.3).baixa * Math.exp(-s * 2.5);
    somar(Math.round(t0 * TAXA) + k, v + 0.25 * Math.sin(2 * Math.PI * 55 * s) * Math.exp(-s * 2));
  }
}

function subida(t0, dur) {
  const f = filtro();
  for (let k = 0; k < dur * TAXA; k++) {
    const x = k / (dur * TAXA);
    somar(Math.round(t0 * TAXA) + k, 0.22 * x ** 2 * f(ruido(), 300 + 6000 * x ** 2, 0.5).banda);
  }
}

function acorde(t0, notas, dur) {
  for (const [j, n] of notas.entries()) {
    const hz = nota(n);
    for (let k = 0; k < dur * TAXA; k++) {
      const s = k / TAXA;
      const v =
        Math.sin(2 * Math.PI * hz * s) +
        0.5 * Math.sin(2 * Math.PI * hz * 1.003 * s) +
        0.25 * Math.sin(4 * Math.PI * hz * s);
      const env = Math.min(1, s / 0.01) * Math.exp(-s * 0.45);
      somar(Math.round(t0 * TAXA) + k, 0.06 * v * env, (j - 1.5) * 0.3);
    }
  }
}

// ─── Cena 1: o número sobe (tique), é riscado (impacto) e vem a pergunta ───
for (let fr = 8; fr <= 30; fr += 2) chimbal(q(fr), 0.9, 0);
impacto(q(52));
dedilhado(q(70), 69, 1.2);
dedilhado(q(70) + 0.12, 76, 1);

// ─── Cenas 2 a 11: batida a 120 bpm, em lá menor (Am, F, C, G) ───
const BATIDA = 0.5;
const comeco = inicios[1];
const fim = inicios[ritmo.segundos.length - 1];
const graus = [
  [45, [57, 60, 64]],
  [41, [57, 60, 65]],
  [48, [55, 60, 64]],
  [43, [55, 59, 62]],
];
for (let b = 0, tb = comeco; tb < fim - 1.6; b++, tb = comeco + b * BATIDA) {
  const compasso = Math.floor(b / 4);
  const [raiz, triade] = graus[Math.floor(compasso / 2) % 4];
  const entrada = b < 8 ? 0.7 : 1;
  bumbo(tb, entrada);
  chimbal(tb + BATIDA / 2, entrada, b % 2 ? -0.25 : 0.25);
  if (b % 4 === 1 || b % 4 === 3) palma(tb);
  baixo(tb, BATIDA * 0.45, raiz + (b % 4 === 3 ? 12 : 0));
  baixo(tb + BATIDA * 0.5, BATIDA * 0.4, raiz + 12);
  if (compasso >= 2) dedilhado(tb + BATIDA * 0.75, triade[b % 3] + 12, 0.8, b % 2 ? 0.4 : -0.4);
}

// ─── Transições: whoosh centrado na troca ───
for (let i = 1; i < inicios.length; i++)
  whoosh(inicios[i] - 0.18, 0.62, i === inicios.length - 1 ? 1.3 : 1);

// ─── Encerramento: subida, impacto e acorde (C maior com nona) ───
subida(fim - 1.6, 1.6);
impacto(fim + 0.05);
acorde(fim + 0.05, [48, 55, 60, 64, 67, 74], 9.5);
// Colchão sustentado até o fim, com o bumbo em meio tempo, para o encerramento não ficar mudo.
for (const [j, n] of [48, 55, 64, 67].entries()) {
  const hz = nota(n);
  for (let k = 0; k < (DURACAO - fim) * TAXA; k++) {
    const s = k / TAXA;
    const v = Math.sin(2 * Math.PI * hz * s + 0.4 * Math.sin(2 * Math.PI * 0.3 * s));
    somar(Math.round(fim * TAXA) + k, 0.035 * v * Math.min(1, s / 1.5), (j - 1.5) * 0.4);
  }
}
for (let tb = fim + 1; tb < DURACAO - 2; tb += 1) bumbo(tb, 0.45);
dedilhado(fim + q(60), 72, 1.2);
dedilhado(fim + q(60) + 0.1, 79, 1);

// ─── Mestre: corta pico, normaliza a -1 dB e esmaece o fim ───
let pico = 0;
for (let i = 0; i < N; i++) {
  E[i] = Math.tanh(E[i] * 1.2);
  D[i] = Math.tanh(D[i] * 1.2);
  pico = Math.max(pico, Math.abs(E[i]), Math.abs(D[i]));
}
const ganho = 0.89 / pico;
const esmaecer = 2 * TAXA;
const wav = Buffer.alloc(44 + N * 4);
wav.write('RIFF', 0);
wav.writeUInt32LE(36 + N * 4, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(TAXA, 24);
wav.writeUInt32LE(TAXA * 4, 28);
wav.writeUInt16LE(4, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const g = ganho * Math.min(1, (N - i) / esmaecer);
  wav.writeInt16LE(Math.round(E[i] * g * 32767), 44 + i * 4);
  wav.writeInt16LE(Math.round(D[i] * g * 32767), 46 + i * 4);
}
writeFileSync(new URL(`../public/${nome}.wav`, import.meta.url), wav);
console.log(`public/${nome}.wav: ${DURACAO.toFixed(2)} s`);
