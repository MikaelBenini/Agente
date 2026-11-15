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

/** Legenda em até 2 linhas, sobre faixa escura (85%), com a palavra forte em amarelo. */
export function Legenda({ linhas, forte }: { linhas: [string, string?]; forte?: string }) {
  const e = useEntrada(6);
  const pintar = (t: string) => {
    if (!forte || !t.includes(forte)) return t;
    const [a, b] = t.split(forte);
    return (
      <>
        {a}
        <span style={{ color: COR.amarelo }}>{forte}</span>
        {b}
      </>
    );
  };
  return (
    <div
      style={{
        position: 'absolute',
        left: 96,
        right: 96,
        bottom: 72,
        display: 'flex',
        justifyContent: 'center',
        opacity: e,
        transform: `translateY(${(1 - e) * 30}px)`,
      }}
    >
      <div
        style={{
          background: 'rgba(11,11,11,0.85)',
          borderRadius: 18,
          padding: '22px 40px',
          fontFamily: TEXTO,
          fontWeight: 600,
          fontSize: 56,
          lineHeight: 1.2,
          color: COR.texto,
          textAlign: 'center',
        }}
      >
        <div>{pintar(linhas[0])}</div>
        {linhas[1] && <div>{pintar(linhas[1])}</div>}
      </div>
    </div>
  );
}

/** Selo do plano (lido de RECURSOS no roteiro), no canto de cima. */
export function Selo({ texto, esquerda = false }: { texto: string; esquerda?: boolean }) {
  const e = useEntrada(10);
  return (
    <div
      style={{
        position: 'absolute',
        top: 64,
        ...(esquerda ? { left: 96 } : { right: 96 }),
        opacity: e,
        border: `3px solid ${COR.amarelo}`,
        color: COR.amarelo,
        borderRadius: 10,
        padding: '8px 18px',
        fontFamily: TEXTO,
        fontWeight: 600,
        fontSize: 34,
        background: 'rgba(11,11,11,0.85)',
      }}
    >
      {texto}
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
}: {
  foto: string;
  destaque?: Retangulo;
  larguraFoto?: number;
  alturaFoto?: number;
  /** Largura da janela na tela (menor quando divide a cena com o celular). */
  largura?: number;
}) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const e = useEntrada();
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.08]);
  const L = largura;
  const escala = L / larguraFoto;
  const H = Math.min(alturaFoto * escala, 820);
  const luz = useEntrada(18);
  return (
    <AbsoluteFill style={{ background: COR.fundo, alignItems: 'center', paddingTop: 70 }}>
      <div
        style={{
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
  const H = Math.min(alturaFoto * escala, 760);
  const subir = interpolate(frame, [20, 150], [0, Math.max(0, alturaFoto * escala - H) * 0.4], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const luz = useEntrada(18);
  return (
    <div
      style={{
        position: 'absolute',
        top: 90,
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
