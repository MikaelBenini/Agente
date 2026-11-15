// Marca do Pente Fino no vídeo (skill video-pente-fino): fundo escuro, amarelo só no que importa,
// verde só no botão final. Títulos em Barlow Condensed 700; texto em Barlow 500 a 600.
import { loadFont as condensada } from '@remotion/google-fonts/BarlowCondensed';
import { loadFont as barlow } from '@remotion/google-fonts/Barlow';

export const COR = {
  fundo: '#0b0b0b',
  cartao: '#141414',
  cartao2: '#1c1c1b',
  texto: '#f4f4ef',
  suave: '#aaaaa1',
  amarelo: '#f5d33b',
  verde: '#a5e34b',
  bordaCelular: '#26262b',
};

export const TITULO = condensada('normal', { weights: ['700'], subsets: ['latin'] }).fontFamily;
export const TEXTO = barlow('normal', { weights: ['500', '600'], subsets: ['latin'] }).fontFamily;

export const FPS = 30;
