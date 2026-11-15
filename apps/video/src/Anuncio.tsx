// Anúncios curtos (15 s) em 9:16 (Reels, Status, TikTok) e 1:1 (feed): gancho, uma função e o
// encerramento (skill video-pente-fino). As mesmas fotos e a mesma transição do vídeo do site.
// No 9:16 ficam livres os 12% de cima e os 20% de baixo, onde o Instagram põe nome e botões.
import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { springTiming, TransitionSeries } from '@remotion/transitions';
import { Encerramento, Gancho } from './Apresentacao';
import { COR, TEXTO, TITULO } from './marca';
import { type Retangulo, useEntrada } from './partes';
import ritmo from './ritmo-anuncio.json';
import { aproximar } from './transicao';

export type Formato = 'vertical' | 'quadrado';

/** Onde vai cada coisa em cada formato (em px da composição de 1080 de largura). */
const LAYOUT: Record<
  Formato,
  {
    altura: number;
    margem: number;
    textoTopo: number;
    titulo: number;
    apoio: number;
    midiaTopo: number;
    midiaAltura: number;
    escalaGancho: number;
  }
> = {
  vertical: {
    altura: 1920,
    margem: 72,
    textoTopo: 250,
    titulo: 104,
    apoio: 46,
    midiaTopo: 680,
    midiaAltura: 850,
    escalaGancho: 0.9,
  },
  quadrado: {
    altura: 1080,
    margem: 60,
    textoTopo: 56,
    titulo: 80,
    apoio: 36,
    midiaTopo: 330,
    midiaAltura: 680,
    escalaGancho: 0.75,
  },
};

type Midia =
  | {
      tipo: 'janela';
      foto: string;
      /** Pedaço da foto (1920 × 1200) que aparece, para ler no celular. */
      recorte: Retangulo;
      destaque?: Retangulo;
    }
  | { tipo: 'celular'; foto: string; alturaFoto: number; destaque?: Retangulo };

export type Funcao = {
  titulo: string;
  forte?: string;
  apoio?: string;
  selo?: string;
  midia: Midia;
};

/** As funções de cada anúncio (frases do roteiro, selos conferidos com RECURSOS). */
export const ANUNCIOS: Record<string, Funcao> = {
  lucro: {
    titulo: 'Sobrou R$ 10.477',
    forte: 'R$ 10.477',
    apoio: 'Depois da comissão, do produto e das despesas.',
    selo: 'Básico, Pro e Premium',
    midia: {
      tipo: 'janela',
      foto: 'telas/02-financeiro.webp',
      recorte: { x: 380, y: 380, w: 760, h: 600 },
      destaque: { x: 420, y: 828, w: 690, h: 62 },
    },
  },
  agenda: {
    titulo: 'O cliente marca sozinho',
    forte: 'sozinho',
    apoio: 'Pelo link, a qualquer hora. Cai direto na agenda.',
    midia: { tipo: 'celular', foto: 'telas/04-link.webp', alturaFoto: 1688 },
  },
  bot: {
    titulo: 'Seu WhatsApp marcando horário',
    forte: 'WhatsApp',
    apoio: 'Sem custo por mensagem.',
    selo: 'Com as Automações',
    midia: {
      tipo: 'janela',
      foto: 'telas/09-bot.webp',
      recorte: { x: 825, y: 645, w: 620, h: 385 },
      destaque: { x: 835, y: 660, w: 545, h: 360 },
    },
  },
};

function TextoTopo({ f, formato }: { f: Funcao; formato: Formato }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const l = LAYOUT[formato];
  const palavras = f.titulo.split(' ');
  const fortes = new Set((f.forte ?? '').split(' ').filter(Boolean));
  const apoioE = useEntrada(8 + palavras.length * 3);
  const seloE = useEntrada(14 + palavras.length * 3);
  return (
    <div
      style={{
        position: 'absolute',
        left: l.margem,
        right: l.margem,
        top: l.textoTopo,
        display: 'flex',
        flexDirection: 'column',
        gap: formato === 'vertical' ? 24 : 14,
      }}
    >
      <div
        style={{
          fontFamily: TITULO,
          fontWeight: 700,
          fontSize: l.titulo,
          lineHeight: 0.95,
          textTransform: 'uppercase',
          display: 'flex',
          flexWrap: 'wrap',
          columnGap: l.titulo * 0.22,
        }}
      >
        {palavras.map((pal, i) => {
          const e = spring({ frame: frame - 4 - i * 3, fps, config: { damping: 18 } });
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                opacity: e,
                transform: `translateY(${(1 - e) * 40}px)`,
                color: fortes.has(pal) ? COR.amarelo : COR.texto,
              }}
            >
              {pal}
            </span>
          );
        })}
      </div>
      {f.apoio && (
        <div
          style={{
            fontFamily: TEXTO,
            fontWeight: 500,
            fontSize: l.apoio,
            lineHeight: 1.25,
            color: COR.suave,
            opacity: apoioE,
          }}
        >
          {f.apoio}
        </div>
      )}
      {f.selo && formato === 'vertical' && (
        <div
          style={{
            alignSelf: 'flex-start',
            opacity: seloE,
            border: `3px solid ${COR.amarelo}`,
            color: COR.amarelo,
            borderRadius: 10,
            padding: '8px 18px',
            fontFamily: TEXTO,
            fontWeight: 600,
            fontSize: 34,
          }}
        >
          {f.selo}
        </div>
      )}
    </div>
  );
}

/** Um pedaço da tela do computador numa janela escura, ampliado para ler no celular. */
function Recorte({ m, formato }: { m: Extract<Midia, { tipo: 'janela' }>; formato: Formato }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const l = LAYOUT[formato];
  const e = useEntrada();
  const luz = useEntrada(18);
  const r = m.recorte;
  const barra = 36;
  const largura = Math.min(1080 - 2 * l.margem, ((l.midiaAltura - barra) * r.w) / r.h);
  const esc = largura / r.w;
  const altura = r.h * esc;
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.06]);
  const d = m.destaque;
  return (
    <div
      style={{
        position: 'absolute',
        left: (1080 - largura) / 2,
        top: l.midiaTopo + (l.midiaAltura - altura - barra) / 2,
        width: largura,
        borderRadius: 18,
        overflow: 'hidden',
        background: COR.cartao,
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        opacity: e,
        transform: `translateY(${(1 - e) * 40}px)`,
      }}
    >
      <div
        style={{ height: barra, display: 'flex', alignItems: 'center', gap: 9, paddingLeft: 18 }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: 6, background: '#3a3a38' }} />
        ))}
      </div>
      <div style={{ position: 'relative', height: altura, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `scale(${zoom})`,
            transformOrigin: d
              ? `${(d.x + d.w / 2 - r.x) * esc}px ${(d.y + d.h / 2 - r.y) * esc}px`
              : 'center',
          }}
        >
          <Img
            src={staticFile(m.foto)}
            style={{
              position: 'absolute',
              left: -r.x * esc,
              top: -r.y * esc,
              width: 1920 * esc,
              maxWidth: 'none',
            }}
          />
          {d && (
            <div
              style={{
                position: 'absolute',
                left: (d.x - r.x) * esc,
                top: (d.y - r.y) * esc,
                width: d.w * esc,
                height: d.h * esc,
                borderRadius: 12,
                border: `4px solid ${COR.amarelo}`,
                boxShadow: `0 0 0 4000px rgba(0,0,0,${0.55 * luz})`,
                opacity: luz,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** A foto do celular num aparelho com borda escura, rolando devagar. */
function CelularAnuncio({
  m,
  formato,
}: {
  m: Extract<Midia, { tipo: 'celular' }>;
  formato: Formato;
}) {
  const frame = useCurrentFrame();
  const l = LAYOUT[formato];
  const e = useEntrada(4);
  const borda = 16;
  const H = l.midiaAltura - 2 * borda;
  const L = Math.round(H * 0.47);
  const esc = L / 780;
  const subir = interpolate(frame, [20, 160], [0, Math.max(0, m.alturaFoto * esc - H) * 0.4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        top: l.midiaTopo,
        left: (1080 - L - 2 * borda) / 2,
        padding: borda,
        borderRadius: 48,
        background: COR.bordaCelular,
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        opacity: e,
        transform: `translateY(${(1 - e) * 60}px)`,
      }}
    >
      <div
        style={{ width: L, height: H, borderRadius: 34, overflow: 'hidden', position: 'relative' }}
      >
        <Img
          src={staticFile(m.foto)}
          style={{ width: L, display: 'block', transform: `translateY(${-subir}px)` }}
        />
      </div>
    </div>
  );
}

function CenaFuncao({ f, formato }: { f: Funcao; formato: Formato }) {
  return (
    <AbsoluteFill style={{ background: COR.fundo }}>
      <TextoTopo f={f} formato={formato} />
      {f.midia.tipo === 'janela' ? (
        <Recorte m={f.midia} formato={formato} />
      ) : (
        <CelularAnuncio m={f.midia} formato={formato} />
      )}
    </AbsoluteFill>
  );
}

const quadros = (i: number) => ritmo.segundos[i] * ritmo.fps;
export const DURACAO_ANUNCIO =
  ritmo.segundos.reduce((s, _x, i) => s + quadros(i), 0) -
  (ritmo.segundos.length - 1) * ritmo.transicao;

export const Anuncio: React.FC<{ funcao: string; formato: Formato }> = ({ funcao, formato }) => {
  const f = ANUNCIOS[funcao];
  const l = LAYOUT[formato];
  const transicao = (
    <TransitionSeries.Transition
      presentation={aproximar()}
      timing={springTiming({ config: { damping: 200 }, durationInFrames: ritmo.transicao })}
    />
  );
  // No 9:16, o gancho e o encerramento ficam no meio da área livre (entre os 12% e os 20%).
  const meio: React.CSSProperties =
    formato === 'vertical' ? { top: l.altura * 0.12, bottom: l.altura * 0.2, height: 'auto' } : {};
  return (
    <AbsoluteFill style={{ background: COR.fundo }}>
      <Audio src={staticFile('trilha-anuncio.wav')} />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={quadros(0)}>
          <AbsoluteFill style={{ background: COR.fundo }}>
            <AbsoluteFill style={meio}>
              <Gancho escala={l.escalaGancho} />
            </AbsoluteFill>
          </AbsoluteFill>
        </TransitionSeries.Sequence>
        {transicao}
        <TransitionSeries.Sequence durationInFrames={quadros(1)}>
          <CenaFuncao f={f} formato={formato} />
        </TransitionSeries.Sequence>
        {transicao}
        <TransitionSeries.Sequence durationInFrames={quadros(2)}>
          <AbsoluteFill style={{ background: COR.fundo }}>
            <AbsoluteFill style={meio}>
              <Encerramento escala={l.escalaGancho * 0.85} />
            </AbsoluteFill>
          </AbsoluteFill>
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
