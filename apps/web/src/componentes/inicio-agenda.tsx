'use client';

// Início do Plano Agenda: os números da agenda do mês no lugar do faturamento e, quando faz
// sentido, um convite (revenda conforme a necessidade): as Automações para quem tem muitas faltas
// e o Básico depois de 30 dias, com os números da própria agenda.
import {
  conviteDoInicio,
  formatarNumero,
  type EstadoDaConta,
  type ResumoDaAgenda,
} from '@pente-fino/shared';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { mesAtual, nomeDoMes } from '@/lib/periodo';
import { useApp } from './contexto-app';
import { Estado } from './pagina';

function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: number; detalhe?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-borda bg-superficie p-4">
      <dt className="text-sm text-tinta-suave">{rotulo}</dt>
      <dd className="font-denso text-3xl font-semibold tabular-nums">{formatarNumero(valor)}</dd>
      {detalhe && <dd className="text-sm text-tinta-suave">{detalhe}</dd>}
    </div>
  );
}

export function InicioAgenda({ situacao }: { situacao: EstadoDaConta }) {
  const { unidadeAtiva, papeis } = useApp();
  const mes = mesAtual();
  const unidade = unidadeAtiva && unidadeAtiva !== 'todas' ? `&unidadeId=${unidadeAtiva}` : '';
  const resumo = useQuery({
    queryKey: ['resumo', 'agenda', mes, unidadeAtiva],
    queryFn: () => api<ResumoDaAgenda>(`resumo/agenda?mes=${mes}${unidade}`),
  });
  const [agora] = useState(() => Date.now());
  const diasDeConta = Math.floor((agora - Date.parse(situacao.contaDesde)) / 86_400_000);
  return (
    <section aria-labelledby="titulo-agenda-mes" className="flex flex-col gap-4">
      <h2 id="titulo-agenda-mes" className="text-xl font-semibold">
        A agenda de {nomeDoMes(mes)}
      </h2>
      <Estado consulta={resumo}>
        {() => {
          const r = resumo.data!;
          const convite = conviteDoInicio({
            plano: situacao.plano,
            automacoes: situacao.automacoes,
            diasDeConta,
            resumo: r,
          });
          return (
            <>
              <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Numero
                  rotulo="Atendidos"
                  valor={r.atendidos}
                  detalhe={`${formatarNumero(r.aVir)} ainda por vir`}
                />
                <Numero rotulo="Clientes novos" valor={r.clientesNovos} />
                <Numero
                  rotulo="Faltas"
                  valor={r.faltas}
                  detalhe={`${formatarNumero(r.cancelados)} cancelados`}
                />
                <Numero
                  rotulo="Marcados pelo cliente"
                  valor={r.peloCliente}
                  detalhe="pelo link ou pelo WhatsApp"
                />
              </dl>
              {convite && papeis.includes('dono') && (
                <Link
                  href={
                    convite.tipo === 'automacoes'
                      ? '/configuracoes?aba=assinatura'
                      : '/conhecer?tela=resultados'
                  }
                  className="flex items-center justify-between gap-4 rounded-lg border-2 border-modulo bg-superficie p-5 hover:bg-superficie-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
                >
                  <span className="flex flex-col gap-1">
                    <span className="text-lg font-semibold">{convite.titulo}</span>
                    <span className="text-tinta-suave">{convite.texto}</span>
                  </span>
                  <ArrowRight aria-hidden className="size-5 shrink-0" />
                </Link>
              )}
            </>
          );
        }}
      </Estado>
    </section>
  );
}
