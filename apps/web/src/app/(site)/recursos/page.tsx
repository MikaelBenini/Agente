import { DIAS_TESTE, type Recurso } from '@pente-fino/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LinkCadastro } from '@/componentes/site/oferta-lancamento';
import { SeloPlano } from '@/componentes/site/selo-plano';
import { TrilhaGoogle } from '@/componentes/site/trilha-google';

export const metadata: Metadata = {
  title: 'Recursos: tudo o que o Pente Fino faz',
  description:
    'Agenda, link de agendamento, site da barbearia, comanda, caixa, comissão, lucro por serviço, WhatsApp, clube de assinatura e várias unidades. Veja tudo o que o Pente Fino faz.',
  alternates: { canonical: '/recursos' },
};

interface Item {
  nome: string;
  texto: string;
  /** Recurso que não vem em todos os planos: mostra o selo do plano (a mesma regra da API). */
  recurso?: Recurso;
}

/** Pedido do dono em 14/11: uma página com tudo o que o sistema faz, por assunto. */
const GRUPOS: readonly { titulo: string; frase: string; itens: readonly Item[] }[] = [
  {
    titulo: 'Agenda e clientes',
    frase: 'O cliente marca sozinho e você vê o dia inteiro numa tela.',
    itens: [
      {
        nome: 'Agenda por barbeiro',
        texto: 'Horário de trabalho, folga e almoço de cada um, lado a lado.',
      },
      {
        nome: 'Link de agendamento',
        texto: 'O cliente escolhe o serviço, o barbeiro e um horário livre.',
      },
      {
        nome: 'Site da barbearia',
        texto: 'Serviços, preços, equipe e fotos, com temas e o seu endereço.',
      },
      {
        nome: 'Avisos no WhatsApp',
        texto: 'Confirmação, lembrete e o link para remarcar ou cancelar.',
      },
      {
        nome: 'Lista de espera',
        texto: 'O horário que vaga vai para quem pediu aquele dia.',
        recurso: 'listaEspera',
      },
      {
        nome: 'Ficha do cliente',
        texto: 'Histórico, aniversário e quem sumiu, para chamar de volta.',
      },
      { nome: 'Encaixe e remarcação', texto: 'Mova o horário e avise o cliente.' },
      { nome: 'Horário de funcionamento', texto: 'Ninguém marca fora do horário da unidade.' },
    ],
  },
  {
    titulo: 'Atendimento e caixa',
    frase: 'Lança uma vez só: o horário vira comanda e a comanda vira caixa.',
    itens: [
      {
        nome: 'Comanda automática',
        texto: 'Agendou, a comanda já existe. O barbeiro só acrescenta.',
        recurso: 'operacao',
      },
      {
        nome: 'App do barbeiro',
        texto: 'No celular, funciona até sem internet e sobe quando volta.',
      },
      {
        nome: 'Caixa do dia',
        texto: 'Abre com o troco, fecha conferindo a gaveta e mostra a diferença.',
        recurso: 'operacao',
      },
      {
        nome: 'Sinal adiantado',
        texto: 'Receba parte antes do horário; abate no fechamento.',
        recurso: 'operacao',
      },
      {
        nome: 'Modo recepção',
        texto: 'A fila do dia em letra grande, para o monitor do balcão.',
        recurso: 'operacao',
      },
      {
        nome: 'Comanda impressa',
        texto: 'PDF com QR code, quatro ou seis por folha.',
        recurso: 'operacao',
      },
    ],
  },
  {
    titulo: 'Dinheiro',
    frase: 'Saiba quanto sobra, não só quanto entrou.',
    itens: [
      {
        nome: 'Resultados do mês',
        texto: 'Faturamento, clientes, ticket médio, extras e a projeção.',
        recurso: 'operacao',
      },
      {
        nome: 'Despesas',
        texto: 'Fixas que se repetem, por grupo, com o peso sobre o faturamento.',
        recurso: 'operacao',
      },
      {
        nome: 'Comissão automática',
        texto: 'Item por item, do jeito que você combina, com extrato.',
        recurso: 'comissoes',
      },
      {
        nome: 'Preço por barbeiro',
        texto: 'Cada barbeiro pode ter o próprio preço de um serviço.',
      },
      {
        nome: 'Metas',
        texto: 'Meta por unidade e por serviço, com o ritmo do mês.',
        recurso: 'metas',
      },
      {
        nome: 'Lucro por serviço',
        texto: 'O que sobra de cada serviço e produto, de verdade.',
        recurso: 'lucroReal',
      },
    ],
  },
  {
    titulo: 'WhatsApp e automações',
    frase:
      'Com o WhatsApp da própria barbearia, sem custo por mensagem e sem inteligência artificial.',
    itens: [
      {
        nome: 'Bot que marca horário',
        texto: 'Menus que você programa, respondendo 24 horas.',
        recurso: 'bot',
      },
      { nome: 'Conversas', texto: 'Quem pediu atendente aparece para a recepção responder.' },
      {
        nome: 'Retorno e aniversário',
        texto: 'Convite para quem sumiu e parabéns no dia.',
        recurso: 'automacoes',
      },
      {
        nome: 'Pesquisa depois do atendimento',
        texto: 'A nota de cada atendimento, com aviso da nota baixa.',
        recurso: 'avaliacoes',
      },
    ],
  },
  {
    titulo: 'Clube e equipe',
    frase: 'Receita que se repete todo mês e uma equipe que sabe onde está.',
    itens: [
      {
        nome: 'Clube de assinatura',
        texto: 'Planos, combos e convênios, com cobrança pelo link.',
        recurso: 'clube',
      },
      {
        nome: 'Ficha e ranking dos barbeiros',
        texto: 'Atendimentos, extras e notas de cada um.',
        recurso: 'fichaProfissional',
      },
      {
        nome: 'Papéis e permissões',
        texto: 'Dono, gestor, recepção e barbeiro veem só o que precisam.',
      },
      {
        nome: 'Várias unidades',
        texto: 'Painel da rede, catálogo e preço por unidade.',
        recurso: 'rede',
      },
    ],
  },
];

export default function Pagina() {
  return (
    <>
      <TrilhaGoogle pagina="Recursos" caminho="/recursos" />
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-8 sm:px-6 md:pt-24">
        <h1 className="max-w-3xl font-denso text-5xl leading-[0.95] font-bold uppercase sm:text-6xl">
          Tudo o que a barbearia precisa
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-tinta-suave">
          Da agenda ao lucro do mês, num lugar só. O selo mostra quando o recurso começa num plano
          acima do Básico.{' '}
          <Link href="/planos" className="text-tinta underline underline-offset-4">
            Compare os planos
          </Link>
        </p>
      </section>
      {GRUPOS.map((g, n) => (
        <section
          key={g.titulo}
          aria-labelledby={`grupo-${n}`}
          className="mx-auto max-w-6xl px-4 py-10 sm:px-6"
        >
          <h2 id={`grupo-${n}`} className="font-denso text-3xl font-bold uppercase sm:text-4xl">
            {g.titulo}
          </h2>
          <p className="mt-2 mb-6 text-tinta-suave">{g.frase}</p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.itens.map((i) => (
              <li
                key={i.nome}
                className="flex flex-col gap-1 rounded-xl border border-borda bg-superficie p-5"
              >
                <span className="flex flex-wrap items-center gap-2 font-semibold">
                  {i.nome}
                  {i.recurso && <SeloPlano recurso={i.recurso} />}
                </span>
                <span className="text-tinta-suave">{i.texto}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-4 py-16 sm:px-6">
        <p className="text-lg text-tinta-suave">{DIAS_TESTE} dias grátis, sem cartão.</p>
        <LinkCadastro grande extra="origem=recursos">
          Testar {DIAS_TESTE} dias grátis
        </LinkCadastro>
      </section>
    </>
  );
}
