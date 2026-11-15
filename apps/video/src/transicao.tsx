// Transição do vídeo (pedido do dono em 15/11: as de esmaecer e deslizar pareciam antigas). Uma
// só, no vídeo inteiro: a cena que sai recua e desfoca; a nova chega com leve aproximação e fica
// nítida. Curva de mola suave, sem movimento linear.
import React from 'react';
import { AbsoluteFill, interpolate } from 'remotion';
import type {
  TransitionPresentation,
  TransitionPresentationComponentProps,
} from '@remotion/transitions';

type Props = Record<string, never>;

const Aproximar: React.FC<TransitionPresentationComponentProps<Props>> = ({
  children,
  presentationDirection,
  presentationProgress: p,
}) => {
  const entrando = presentationDirection === 'entering';
  const escala = entrando ? interpolate(p, [0, 1], [1.06, 1]) : interpolate(p, [0, 1], [1, 0.94]);
  const desfoque = entrando ? (1 - p) * 14 : p * 10;
  const opacidade = entrando ? p : interpolate(p, [0, 1], [1, 0.4]);
  return (
    <AbsoluteFill
      style={{
        opacity: opacidade,
        transform: `scale(${escala})`,
        filter: `blur(${desfoque}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const aproximar = (): TransitionPresentation<Props> => ({
  component: Aproximar,
  props: {},
});
