import {
  COMISSAO_INDICACAO_BP,
  DIAS_PARA_LIBERAR,
  DIAS_TESTE_INDICADA,
  formatarMoeda,
  MESES_COM_COMISSAO,
  MINIMO_SAQUE,
} from '@pente-fino/shared';
import type { Metadata } from 'next';
import { CadastroIndicador } from '@/componentes/site/indique';

export const metadata: Metadata = {
  title: 'Indique e ganhe',
  description:
    'Conhece um barbeiro? Indique o Pente Fino e ganhe 20% das mensalidades da barbearia nos 12 primeiros meses, em Pix. Qualquer pessoa pode indicar.',
  alternates: { canonical: '/indique' },
};

const PCT = `${COMISSAO_INDICACAO_BP / 100}%`;

/** Indique e ganhe (regras do dono em 14/11): qualquer pessoa indica, não só barbeiro. */
export default function Pagina() {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.1fr_1fr] md:py-24">
      <div className="flex flex-col gap-6">
        <h1 className="font-denso text-5xl leading-[0.95] font-bold uppercase sm:text-6xl">
          Conhece um barbeiro? Indique e ganhe
        </h1>
        <p className="text-lg text-tinta-suave">
          Qualquer pessoa pode indicar: barbeiro, cliente de barbearia, fornecedor ou quem tem um
          amigo com cadeira. Você ganha {PCT} de cada mensalidade que a barbearia indicada pagar,
          durante os {MESES_COM_COMISSAO} primeiros meses dela, direto no seu Pix.
        </p>
        <ol className="flex flex-col gap-4">
          {[
            ['Gere o seu link', 'Cadastro grátis, com o seu CPF e a chave Pix.'],
            [
              'Mande para quem tem barbearia',
              `Quem entra pelo seu link ganha ${DIAS_TESTE_INDICADA} dias para testar.`,
            ],
            [
              'Receba no Pix',
              `${PCT} de cada mensalidade paga, liberado ${DIAS_PARA_LIBERAR} dias depois. O Pix sai uma vez por mês, a partir de ${formatarMoeda(MINIMO_SAQUE)}.`,
            ],
          ].map(([t, d], n) => (
            <li key={t} className="flex gap-4">
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-full bg-modulo font-denso text-lg font-bold text-sobre-modulo"
              >
                {n + 1}
              </span>
              <span className="flex flex-col">
                <strong>{t}</strong>
                <span className="text-tinta-suave">{d}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-tinta-suave">
          Já usa o Pente Fino? O seu link fica em Configurações, na aba Indique e ganhe, e lá você
          pode trocar o Pix por 1 mês grátis na sua assinatura a cada barbearia que pagar.
        </p>
      </div>
      <CadastroIndicador />
    </section>
  );
}
