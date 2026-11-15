// Vídeo novo do site (roteiro em apps/web/video/roteiro.md, aprovado pelo dono em 15/11).
// Só fotos reais das telas (apps/web/video/fotos-video.mjs); preço e "14 dias" de dados.json,
// gerado de @pente-fino/shared. Uma transição só (src/transicao.tsx).
import React from 'react';
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { springTiming, TransitionSeries } from '@remotion/transitions';
import { aproximar } from './transicao';
import dados from './dados.json';
import ritmo from './ritmo.json';
import { COR, TEXTO } from './marca';
import { Celular, JanelaNavegador, Texto, Titulo, useEntrada } from './partes';

// Duração das cenas em ritmo.json, lida também pelo scripts/trilha.mjs (o som segue as cenas).
const TRANSICAO = ritmo.transicao;

function Gancho() {
  const frame = useCurrentFrame();
  const valor = Math.round(interpolate(frame, [8, 30], [0, 52880], { extrapolateRight: 'clamp' }));
  const risco = interpolate(frame, [52, 66], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const pergunta = useEntrada(70);
  return (
    <AbsoluteFill
      style={{ background: COR.fundo, justifyContent: 'center', alignItems: 'center', gap: 40 }}
    >
      <Titulo tamanho={110}>Faturou</Titulo>
      <div style={{ position: 'relative' }}>
        <Titulo tamanho={200}>
          <span style={{ color: COR.amarelo, fontVariantNumeric: 'tabular-nums' }}>
            R$ {valor.toLocaleString('pt-BR')}
          </span>
        </Titulo>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: '52%',
            height: 14,
            width: `${risco * 100}%`,
            background: COR.texto,
            borderRadius: 7,
          }}
        />
      </div>
      <div style={{ opacity: pergunta, transform: `translateY(${(1 - pergunta) * 30}px)` }}>
        <Titulo tamanho={130}>Quanto sobrou?</Titulo>
      </div>
    </AbsoluteFill>
  );
}

function Encerramento() {
  const a = useEntrada(0);
  const b = useEntrada(30);
  const c = useEntrada(60);
  return (
    <AbsoluteFill
      style={{ background: COR.fundo, justifyContent: 'center', alignItems: 'center', gap: 48 }}
    >
      <div style={{ opacity: a, transform: `translateY(${(1 - a) * 30}px)` }}>
        <Titulo tamanho={130}>
          <span style={{ color: COR.amarelo }}>Saiba quanto sobra,</span>
          <br />
          não só quanto entrou.
        </Titulo>
      </div>
      <div
        style={{
          opacity: b,
          fontFamily: TEXTO,
          fontWeight: 600,
          fontSize: 56,
          color: COR.suave,
          textAlign: 'center',
        }}
      >
        seupentefino.com.br
        <br />
        {dados.diasTeste} dias grátis, sem cartão
      </div>
      <div
        style={{
          opacity: c,
          transform: `scale(${0.9 + 0.1 * c})`,
          background: COR.verde,
          color: COR.fundo,
          fontFamily: TEXTO,
          fontWeight: 600,
          fontSize: 60,
          padding: '24px 64px',
          borderRadius: 18,
        }}
      >
        Testar grátis
      </div>
    </AbsoluteFill>
  );
}

type Cena = { corpo: React.ReactNode };

const CENAS: Cena[] = [
  { corpo: <Gancho /> },
  {
    corpo: (
      <>
        <JanelaNavegador
          foto="telas/02-financeiro.webp"
          esquerda={700}
          largura={1140}
          destaque={{ x: 420, y: 830, w: 700, h: 75 }}
        />
        <Texto
          titulo="Sobrou R$ 10.477"
          forte="R$ 10.477"
          apoio="Depois da comissão, do produto e das despesas."
          selo="Básico, Pro e Premium"
        />
      </>
    ),
  },
  {
    corpo: (
      <>
        <JanelaNavegador
          foto="telas/03-margem.webp"
          esquerda={700}
          largura={1140}
          destaque={{ x: 1690, y: 520, w: 190, h: 640 }}
        />
        <Texto
          titulo="A margem de cada serviço"
          forte="margem"
          apoio="O corte que mais vende nem sempre é o que mais sobra."
          selo="Premium"
        />
      </>
    ),
  },
  {
    corpo: (
      <>
        <JanelaNavegador
          foto="telas/04-agenda.webp"
          esquerda={880}
          largura={980}
          destaque={{ x: 945, y: 345, w: 440, h: 260 }}
        />
        <Celular foto="telas/04-link.webp" alturaFoto={1688} esquerda={660} />
        <Texto
          titulo="O cliente marca sozinho"
          forte="sozinho"
          apoio="Pelo link, a qualquer hora. Cai direto na agenda."
          largura={500}
        />
      </>
    ),
  },
  {
    corpo: (
      <>
        <Celular foto="telas/05-comanda.webp" alturaFoto={1328} esquerda={1060} />
        <Texto
          titulo="A comanda já existe"
          forte="já existe"
          apoio="Marcou o horário, ela abre sozinha. O barbeiro só lança o extra."
          selo="Básico, Pro e Premium"
        />
      </>
    ),
  },
  {
    corpo: (
      <>
        <JanelaNavegador
          foto="telas/06-comissoes.webp"
          esquerda={700}
          largura={960}
          destaque={{ x: 790, y: 440, w: 220, h: 480 }}
        />
        <Celular
          foto="telas/06-extrato.webp"
          alturaFoto={1688}
          esquerda={1440}
          destaque={{ x: 33, y: 503, w: 345, h: 287 }}
        />
        <Texto
          titulo="A comissão sai sozinha"
          forte="sozinha"
          apoio="Sem planilha. Cada barbeiro vê o extrato no celular."
          selo="Básico, Pro e Premium"
        />
      </>
    ),
  },
  {
    corpo: (
      <>
        <JanelaNavegador
          foto="telas/07-caixa.webp"
          esquerda={700}
          largura={1140}
          destaque={{ x: 1380, y: 320, w: 480, h: 450 }}
        />
        <Texto
          titulo="O caixa bate"
          forte="bate"
          apoio="Fechou, a diferença aparece na hora."
          selo="Básico, Pro e Premium"
        />
      </>
    ),
  },
  {
    corpo: (
      <>
        <JanelaNavegador
          foto="telas/08-lembretes.webp"
          esquerda={700}
          largura={1140}
          destaque={{ x: 405, y: 710, w: 1025, h: 335 }}
        />
        <Texto
          titulo="Menos cadeira vazia"
          forte="vazia"
          apoio="Lembrete que confirma. O horário vago vai para a lista de espera."
          selo="Lista de espera: Automações"
        />
      </>
    ),
  },
  {
    corpo: (
      <>
        <JanelaNavegador
          foto="telas/09-bot.webp"
          esquerda={700}
          largura={1140}
          destaque={{ x: 835, y: 660, w: 545, h: 360 }}
        />
        <Texto
          titulo="Seu WhatsApp marcando horário"
          forte="WhatsApp"
          apoio="Sem custo por mensagem e sem inteligência artificial."
          selo="Com as Automações"
        />
      </>
    ),
  },
  {
    corpo: (
      <>
        <JanelaNavegador foto="telas/10-site-a.webp" esquerda={700} largura={1140} />
        <Texto
          titulo="Site com a cara da barbearia"
          forte="cara"
          apoio="Pronto em minutos, com o botão de agendar."
        />
      </>
    ),
  },
  {
    corpo: (
      <>
        <JanelaNavegador
          foto="telas/11-clube.webp"
          esquerda={700}
          largura={1140}
          destaque={{ x: 405, y: 395, w: 1450, h: 230 }}
        />
        <Texto
          titulo="Receita todo mês"
          forte="todo mês"
          apoio="Clube de assinatura, com cobrança pelo link."
          selo="Pro e Premium"
        />
      </>
    ),
  },
  { corpo: <Encerramento /> },
];

if (ritmo.segundos.length !== CENAS.length) throw new Error('ritmo.json fora do número de cenas');
const quadros = (i: number) => ritmo.segundos[i] * ritmo.fps;

export const DURACAO =
  CENAS.reduce((s, _c, i) => s + quadros(i), 0) - (CENAS.length - 1) * TRANSICAO;

export const Apresentacao: React.FC = () => (
  <>
    <Audio src={staticFile('trilha.wav')} />
    <TransitionSeries>
      {CENAS.flatMap((c, i) => [
        <TransitionSeries.Sequence key={`c${i}`} durationInFrames={quadros(i)}>
          <AbsoluteFill style={{ background: COR.fundo }}>{c.corpo}</AbsoluteFill>
        </TransitionSeries.Sequence>,
        ...(i < CENAS.length - 1
          ? [
              <TransitionSeries.Transition
                key={`t${i}`}
                presentation={aproximar()}
                timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSICAO })}
              />,
            ]
          : []),
      ])}
    </TransitionSeries>
  </>
);
