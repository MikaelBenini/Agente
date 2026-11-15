import { Composition } from 'remotion';
import { Anuncio, ANUNCIOS, DURACAO_ANUNCIO, type Formato } from './Anuncio';
import { Apresentacao, DURACAO } from './Apresentacao';

const FORMATOS: { formato: Formato; altura: number }[] = [
  { formato: 'vertical', altura: 1920 },
  { formato: 'quadrado', altura: 1080 },
];

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Apresentacao"
      component={Apresentacao}
      durationInFrames={DURACAO}
      fps={30}
      width={1920}
      height={1080}
    />
    {Object.keys(ANUNCIOS).flatMap((funcao) =>
      FORMATOS.map(({ formato, altura }) => (
        <Composition
          key={`${funcao}-${formato}`}
          id={`Anuncio-${funcao}-${formato}`}
          component={Anuncio}
          durationInFrames={DURACAO_ANUNCIO}
          fps={30}
          width={1080}
          height={altura}
          defaultProps={{ funcao, formato }}
        />
      )),
    )}
  </>
);
