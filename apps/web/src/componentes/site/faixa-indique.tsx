'use client';

import {
  COMISSAO_INDICACAO_BP,
  DIAS_TESTE_INDICADA,
  formatarMoeda,
  MESES_COM_COMISSAO,
  precoPorMes,
} from '@pente-fino/shared';
import { HandCoins } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useTabelaPrecos } from '@/lib/consultas';

const PCT = `${COMISSAO_INDICACAO_BP / 100}%`;

/**
 * Indique e ganhe na página de vendas, para quem não tem barbearia (pedido do dono em 15/11): a
 * pessoa escolhe quantas barbearias conhece e vê quanto ganharia com elas no plano Pro mensal.
 */
export function FaixaIndique() {
  const tabela = useTabelaPrecos();
  const [quantas, setQuantas] = useState(3);
  const mensalidade = precoPorMes('pro', 'mensal', 1, tabela);
  const porMes = Math.round((mensalidade * COMISSAO_INDICACAO_BP) / 10000) * quantas;

  return (
    <section
      aria-labelledby="indique"
      className="border-y border-borda bg-[linear-gradient(180deg,var(--superficie-2),var(--fundo))]"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.1fr_1fr] md:py-24">
        <div className="flex flex-col gap-5">
          <h2
            id="indique"
            className="scroll-mt-24 font-denso text-4xl font-bold uppercase sm:text-5xl"
          >
            Não tem barbearia? Ganhe indicando
          </h2>
          <p className="text-lg text-tinta-suave">
            Conhece um barbeiro, corta sempre no mesmo lugar ou vende para barbearias? Mande o seu
            link. Você ganha {PCT} de cada mensalidade que a barbearia pagar, durante{' '}
            {MESES_COM_COMISSAO} meses, direto no seu Pix. Quem entra pelo link testa{' '}
            {DIAS_TESTE_INDICADA} dias grátis.
          </p>
          <ul className="flex flex-col gap-2 text-tinta-suave">
            <li>Cadastro grátis, só com CPF e chave Pix.</li>
            <li>Não precisa ser cliente nem ter barbearia.</li>
            <li>Acompanhe as indicações e os ganhos no seu painel.</li>
          </ul>
          <Link
            href="/indique"
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-modulo px-5 py-3 font-semibold text-sobre-modulo transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-modulo"
          >
            <HandCoins className="size-5" aria-hidden />
            Quero o meu link
          </Link>
        </div>

        <div className="flex flex-col gap-5 rounded-2xl border border-borda bg-superficie p-6 sm:p-8">
          <label htmlFor="quantas-barbearias" className="font-semibold">
            Quantas barbearias você conhece?
          </label>
          <div className="flex items-center gap-4">
            <input
              id="quantas-barbearias"
              type="range"
              min={1}
              max={20}
              value={quantas}
              onChange={(e) => setQuantas(Number(e.target.value))}
              className="w-full accent-[var(--modulo)]"
            />
            <span className="w-10 text-right font-denso text-3xl font-bold tabular-nums">
              {quantas}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4" aria-live="polite">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-tinta-suave">Por mês</span>
              <strong className="font-denso text-4xl text-modulo-texto tabular-nums">
                {formatarMoeda(porMes)}
              </strong>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-tinta-suave">Em {MESES_COM_COMISSAO} meses</span>
              <strong className="font-denso text-4xl tabular-nums">
                {formatarMoeda(porMes * MESES_COM_COMISSAO)}
              </strong>
            </div>
          </div>
          <p className="text-sm text-tinta-suave">
            Conta com o plano Pro mensal ({formatarMoeda(mensalidade)}). O valor muda com o plano
            que cada barbearia escolher.
          </p>
        </div>
      </div>
    </section>
  );
}
