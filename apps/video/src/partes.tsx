import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { COR, TEXTO, TITULO } from './marca';

/** Entrada com mola (damping 16), de 0 a 1. */
export function useEntrada(atraso = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - atraso, fps, config: { damping: 16 } });
}

/**
 * O texto da cena como parte da composição (pedido do dono em 15/11: sem cara de legenda dublada):
 * na coluna da esquerda, a frase grande entra palavra por palavra, a palavra forte em amarelo, e a
 * frase de apoio vem menor embaixo, com o selo do plano.
 */
export function Texto({
  titulo,
  apoio,
  forte,
  selo,
  largura = 540,
}: {
  titulo: string;
  apoio?: string;
  forte?: string;
  selo?: string;
  largura?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const palavras = titulo.split(' ');
  const fortes = new Set((forte ?? '').split(' ').filter(Boolean));
  const apoioE = useEntrada(8 + palavras.length * 3);
  const seloE = useEntrada(14 + palavras.length * 3);
  return (
    <div
      style={{
        position: 'absolute',
        left: 96,
        top: 0,
        bottom: 0,
        width: largura,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 28,
      }}
    >
      <div
        style={{
          fontFamily: TITULO,
          fontWeight: 700,
          fontSize: 96,
          lineHeight: 0.95,
          textTransform: 'uppercase',
          color: COR.texto,
          display: 'flex',
          flexWrap: 'wrap',
          columnGap: 22,
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
                color:
                  fortes.has(pal.replace(/[.,:]/g, '')) || fortes.has(pal)
                    ? COR.amarelo
                    : COR.texto,
              }}
            >
              {pal}
            </span>
          );
        })}
      </div>
      {apoio && (
        <div
          style={{
            fontFamily: TEXTO,
            fontWeight: 500,
            fontSize: 44,
            lineHeight: 1.25,
            color: COR.suave,
            opacity: apoioE,
            transform: `translateY(${(1 - apoioE) * 20}px)`,
          }}
        >
          {apoio}
        </div>
      )}
      {selo && (
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
            fontSize: 32,
            whiteSpace: 'nowrap',
          }}
        >
          {selo}
        </div>
      )}
    </div>
  );
}

export type Retangulo = { x: number; y: number; w: number; h: number };

/**
 * A foto da tela numa janela de navegador escura, com aproximação lenta (1,00 → 1,08) e o ponto
 * que importa com contorno amarelo e o resto escurecido.
 */
export function JanelaNavegador({
  foto,
  destaque,
  larguraFoto = 1920,
  alturaFoto = 1200,
  largura = 1560,
  esquerda,
}: {
  foto: string;
  destaque?: Retangulo;
  larguraFoto?: number;
  alturaFoto?: number;
  /** Largura da janela na tela (menor quando divide a cena com o celular). */
  largura?: number;
  /** Posição da janela; sem ela, centralizada. */
  esquerda?: number;
}) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const e = useEntrada();
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.08]);
  const L = largura;
  const escala = L / larguraFoto;
  const H = Math.min(alturaFoto * escala, 900);
  const luz = useEntrada(18);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: esquerda ?? (1920 - L) / 2,
          top: (1080 - H - 44) / 2,
          width: L,
          borderRadius: 18,
          overflow: 'hidden',
          background: COR.cartao,
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          opacity: e,
          transform: `translateY(${(1 - e) * 40}px)`,
        }}
      >
        <div
          style={{ height: 44, display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 20 }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{ width: 14, height: 14, borderRadius: 7, background: '#3a3a38' }}
            />
          ))}
        </div>
        <div style={{ position: 'relative', height: H, overflow: 'hidden' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transform: `scale(${zoom})`,
              transformOrigin: destaque
                ? `${(destaque.x + destaque.w / 2) * escala}px ${(destaque.y + destaque.h / 2) * escala}px`
                : 'center top',
            }}
          >
            <Img src={staticFile(foto)} style={{ width: L, display: 'block' }} />
            {destaque && (
              <div
                style={{
                  position: 'absolute',
                  left: destaque.x * escala,
                  top: destaque.y * escala,
                  width: destaque.w * escala,
                  height: destaque.h * escala,
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
    </AbsoluteFill>
  );
}

/** A foto do celular num aparelho com borda escura; opcionalmente ao lado de uma janela. */
export function Celular({
  foto,
  alturaFoto,
  esquerda,
  destaque,
}: {
  foto: string;
  alturaFoto: number;
  esquerda?: number;
  destaque?: Retangulo;
}) {
  const frame = useCurrentFrame();
  const e = useEntrada(4);
  const L = 380;
  const escala = L / 780;
  const H = Math.min(alturaFoto * escala, 860);
  const subir = interpolate(frame, [20, 150], [0, Math.max(0, alturaFoto * escala - H) * 0.4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const luz = useEntrada(18);
  return (
    <div
      style={{
        position: 'absolute',
        top: (1080 - H - 36) / 2,
        left: esquerda ?? (1920 - L - 36) / 2,
        padding: 18,
        borderRadius: 54,
        background: COR.bordaCelular,
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        opacity: e,
        transform: `translateY(${(1 - e) * 60}px)`,
      }}
    >
      <div
        style={{ width: L, height: H, borderRadius: 38, overflow: 'hidden', position: 'relative' }}
      >
        <div style={{ position: 'absolute', inset: 0, transform: `translateY(${-subir}px)` }}>
          <Img src={staticFile(foto)} style={{ width: L, display: 'block' }} />
          {destaque && (
            <div
              style={{
                position: 'absolute',
                left: destaque.x * escala,
                top: destaque.y * escala,
                width: destaque.w * escala,
                height: destaque.h * escala,
                borderRadius: 12,
                border: `4px solid ${COR.amarelo}`,
                opacity: luz,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** Título grande da marca (Barlow Condensed 700, maiúsculas, entrelinha 0,95). */
export function Titulo({
  children,
  tamanho = 120,
}: {
  children: React.ReactNode;
  tamanho?: number;
}) {
  return (
    <div
      style={{
        fontFamily: TITULO,
        fontWeight: 700,
        fontSize: tamanho,
        lineHeight: 0.95,
        textTransform: 'uppercase',
        color: COR.texto,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
}
