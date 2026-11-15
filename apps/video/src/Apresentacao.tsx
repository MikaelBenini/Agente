// Vídeo novo do site (roteiro em apps/web/video/roteiro.md, aprovado pelo dono em 15/11).
// Só fotos reais das telas (apps/web/video/fotos-video.mjs); preço e "14 dias" de dados.json,
// gerado de @pente-fino/shared. Duas transições: deslizar e esmaecer.
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import dados from './dados.json';
import { COR, TEXTO } from './marca';
import { Celular, JanelaNavegador, Legenda, Selo, Titulo, useEntrada } from './partes';

const TRANSICAO = 15;

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

type Cena = { segundos: number; corpo: React.ReactNode };

const CENAS: Cena[] = [
  { segundos: 4, corpo: <Gancho /> },
  {
    segundos: 6,
    corpo: (
      <>
        <JanelaNavegador
          foto="telas/02-financeiro.webp"
          destaque={{ x: 420, y: 830, w: 700, h: 75 }}
        />
        <Legenda
          linhas={['Comissão, produto e despesas.', 'Sobrou R$ 10.477.']}
          forte="R$ 10.477"
        />
        <Selo texto="Básico, Pro e Premium" />
      </>
    ),
  },
  {
    segundos: 6,
    corpo: (
      <>
        <JanelaNavegador
          foto="telas/03-margem.webp"
          destaque={{ x: 1690, y: 520, w: 190, h: 640 }}
        />
        <Legenda linhas={['O corte que mais vende', 'nem sempre é o que mais sobra.']} />
        <Selo texto="Premium" />
      </>
    ),
  },
  {
    segundos: 6,
    corpo: (
      <>
        <AbsoluteFill style={{ background: COR.fundo }} />
        <div style={{ position: 'absolute', left: 560, right: 40, top: 0, bottom: 0 }}>
          <JanelaNavegador
            foto="telas/04-agenda.webp"
            largura={1280}
            destaque={{ x: 945, y: 345, w: 440, h: 260 }}
          />
        </div>
        <Celular foto="telas/04-link.webp" alturaFoto={1688} esquerda={120} />
        <Legenda linhas={['O cliente marca sozinho,', 'até de madrugada.']} />
      </>
    ),
  },
  {
    segundos: 5,
    corpo: (
      <>
        <AbsoluteFill style={{ background: COR.fundo }} />
        <Celular foto="telas/05-comanda.webp" alturaFoto={1328} />
        <Legenda linhas={['Marcou, a comanda já existe.', 'O barbeiro só acrescenta.']} />
        <Selo texto="Básico, Pro e Premium" />
      </>
    ),
  },
  {
    segundos: 5,
    corpo: (
      <>
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 40, right: 560 }}>
          <JanelaNavegador
            foto="telas/06-comissoes.webp"
            largura={1280}
            destaque={{ x: 790, y: 440, w: 220, h: 480 }}
          />
        </div>
        <Celular
          foto="telas/06-extrato.webp"
          alturaFoto={1688}
          esquerda={1400}
          destaque={{ x: 33, y: 503, w: 345, h: 287 }}
        />
        <Legenda
          linhas={['A comissão sai sozinha.', 'Sem planilha.']}
          forte="A comissão sai sozinha."
        />
        <Selo texto="Básico, Pro e Premium" esquerda />
      </>
    ),
  },
  {
    segundos: 6,
    corpo: (
      <>
        <JanelaNavegador
          foto="telas/07-caixa.webp"
          destaque={{ x: 1380, y: 320, w: 480, h: 450 }}
        />
        <Legenda linhas={['Fechou o caixa:', 'a diferença aparece na hora.']} />
        <Selo texto="Básico, Pro e Premium" />
      </>
    ),
  },
  {
    segundos: 6,
    corpo: (
      <>
        <JanelaNavegador
          foto="telas/08-lembretes.webp"
          destaque={{ x: 405, y: 710, w: 1025, h: 335 }}
        />
        <Legenda linhas={['Lembrete que confirma.', 'Horário vago que se preenche.']} />
        <Selo texto="Lista de espera: com as Automações" />
      </>
    ),
  },
  {
    segundos: 6,
    corpo: (
      <>
        <JanelaNavegador foto="telas/09-bot.webp" />
        <Legenda
          linhas={['Seu WhatsApp marcando horário', 'sem custo por mensagem.']}
          forte="sem custo por mensagem."
        />
        <Selo texto="Com as Automações" />
      </>
    ),
  },
  {
    segundos: 5,
    corpo: (
      <>
        <JanelaNavegador foto="telas/10-site-a.webp" />
        <Legenda linhas={['Site com a cara da barbearia,', 'em minutos.']} />
      </>
    ),
  },
  {
    segundos: 5,
    corpo: (
      <>
        <JanelaNavegador
          foto="telas/11-clube.webp"
          destaque={{ x: 405, y: 395, w: 1450, h: 230 }}
        />
        <Legenda linhas={['Receita que se repete', 'todo mês.']} />
        <Selo texto="Pro e Premium" />
      </>
    ),
  },
  { segundos: 9, corpo: <Encerramento /> },
];

export const DURACAO =
  CENAS.reduce((s, c) => s + c.segundos * 30, 0) - (CENAS.length - 1) * TRANSICAO;

export const Apresentacao: React.FC = () => (
  <TransitionSeries>
    {CENAS.flatMap((c, i) => [
      <TransitionSeries.Sequence key={`c${i}`} durationInFrames={c.segundos * 30}>
        <AbsoluteFill style={{ background: COR.fundo }}>{c.corpo}</AbsoluteFill>
      </TransitionSeries.Sequence>,
      ...(i < CENAS.length - 1
        ? [
            <TransitionSeries.Transition
              key={`t${i}`}
              presentation={i % 2 === 0 ? fade() : slide({ direction: 'from-right' })}
              timing={linearTiming({ durationInFrames: TRANSICAO })}
            />,
          ]
        : []),
    ])}
  </TransitionSeries>
);
