// Site N2: comparação justa com um concorrente (ou com todos), só com fatos conferidos na página
// oficial de cada um, com a data e o link. Os preços do Pente Fino saem da tabela de planos.
import {
  DIAS_TESTE,
  formatarMoeda,
  LIMITES_PLANO,
  NOME_PLANO,
  PLANOS,
  precoPorMes,
} from '@pente-fino/shared';
import { Check, Contrast, X } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CONCORRENTES,
  CONFERIDO_EM,
  type Concorrente,
  PENTE_FINO,
  PENTE_FINO_RESUMO,
  type Sinal,
} from '@/conteudo/comparativos';
import { LinkCadastro } from './oferta-lancamento';
import { TrilhaGoogle } from './trilha-google';

const EQUIPES = [1, 3, 5] as const;

const dataBr = (iso: string) => iso.split('-').reverse().join('/');

/** Traço discreto quando o site do sistema não informa (legenda em `Fontes`). */
const NaoInforma = () => (
  <span aria-label="O site não informa" className="text-tinta-fraca">
    —
  </span>
);

/**
 * Pedido do dono em 15/11: nada de "Não citado" repetido. Sem informação vira o traço; quando a
 * frase traz algo depois ("Não citado; lembretes inclusos"), fica só essa parte.
 */
function valor(v: string | null): React.ReactNode {
  if (!v) return <NaoInforma />;
  const m = /^Não citado(?: na página de preços)?(?:[;:]\s*|\s*\((.*)\))?(.*)$/.exec(v);
  if (!m) return v;
  const resto = (m[1] ?? m[2] ?? '').trim();
  return resto ? resto[0]!.toUpperCase() + resto.slice(1) : <NaoInforma />;
}

// Os concorrentes são sistemas completos (comanda, caixa, comissão): o Agenda, que é só a
// agenda, fica fora desta comparação.
const COMPLETOS = PLANOS.filter((p) => p !== 'agenda');

/** Plano mais barato do Pente Fino que cabe a equipe, com o preço mensal. */
function penteFinoPara(n: number) {
  const plano = COMPLETOS.find((p) => LIMITES_PLANO[p].profissionais >= n) ?? 'premium';
  return `${formatarMoeda(precoPorMes(plano, 'mensal'))} (${NOME_PLANO[plano]})`;
}

export function metadadosComparativo(titulo: string, descricao: string, caminho: string): Metadata {
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: caminho },
    openGraph: { title: titulo, description: descricao, url: caminho },
  };
}

const Cabecalho = ({ sobre, titulo, texto }: { sobre: string; titulo: string; texto: string }) => (
  <section className="mx-auto flex max-w-4xl flex-col gap-5 px-4 pt-14 pb-10 sm:px-6 sm:pt-20">
    <p className="font-denso text-lg font-semibold tracking-widest text-modulo-texto uppercase">
      {sobre}
    </p>
    <h1 className="font-denso text-4xl leading-[0.95] font-bold uppercase sm:text-6xl">{titulo}</h1>
    <p className="max-w-3xl text-lg text-tinta-suave">{texto}</p>
  </section>
);

function Tabela({
  legenda,
  colunas,
  linhas,
}: {
  legenda: string;
  colunas: readonly string[];
  linhas: readonly (readonly React.ReactNode[])[];
}) {
  // Guia ui-atoms/responsive-table: na largura de celular a tabela vira um cartão por linha, com o
  // nome da coluna antes de cada valor (pelo tamanho da própria área, @container); mais larga,
  // rola para o lado com a primeira coluna presa.
  return (
    <div className="@container">
      <div
        role="region"
        aria-label={`${legenda}, role para o lado`}
        tabIndex={0}
        className="dica-rolagem overflow-x-auto rounded-xl border border-borda focus-visible:outline-2 focus-visible:outline-foco"
      >
        <table
          className={`w-full min-w-[36rem] text-left text-sm @max-[36rem]:block @max-[36rem]:min-w-0`}
        >
          <caption className="sr-only">{legenda}</caption>
          <thead className={`bg-superficie-2 @max-[36rem]:hidden`}>
            <tr>
              {colunas.map((c, i) => (
                <th
                  key={c || i}
                  scope="col"
                  className={`px-4 py-3 font-semibold ${i ? '' : 'sticky left-0 w-44 bg-superficie-2'}`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y divide-borda @max-[36rem]:block`}>
            {linhas.map(([rotulo, ...valores], k) => (
              <tr key={k} className={`@max-[36rem]:block @max-[36rem]:py-2`}>
                <th
                  scope="row"
                  className={`sticky left-0 bg-fundo px-4 py-3 align-top font-medium @max-[36rem]:static @max-[36rem]:block @max-[36rem]:pb-1`}
                >
                  {rotulo}
                </th>
                {valores.map((v, i) => (
                  <td
                    key={i}
                    data-coluna={colunas[i + 1]}
                    className={`px-4 py-3 align-top text-tinta-suave @max-[36rem]:block @max-[36rem]:py-1 @max-[36rem]:before:block @max-[36rem]:before:text-xs @max-[36rem]:before:font-semibold @max-[36rem]:before:text-tinta @max-[36rem]:before:content-[attr(data-coluna)]`}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Fontes({ itens }: { itens: readonly Concorrente[] }) {
  return (
    <section className="mx-auto max-w-4xl px-4 pb-10 text-sm text-tinta-suave sm:px-6">
      <h2 className="mb-2 font-semibold text-tinta">Fontes</h2>
      <p className="mb-2">
        Conferido em {dataBr(CONFERIDO_EM)} nas páginas oficiais. Preço e plano mudam: confira
        sempre na fonte. O traço (—) quer dizer que o site do sistema não informa. As marcas citadas
        pertencem aos seus donos.
      </p>
      <ul className="flex flex-col gap-1">
        {itens.map((c) => (
          <li key={c.slug}>
            {/* Fonte citada sem link, para não mandar visita ao concorrente (pedido do dono). */}
            {c.nome}: {c.fonte.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
            {c.conferidoEm && ` (conferido em ${dataBr(c.conferidoEm)})`}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Chamada() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 pb-16 text-center sm:px-6">
      <h2 className="font-denso text-4xl font-bold uppercase">Teste e compare você mesmo</h2>
      <p className="text-tinta-suave">{DIAS_TESTE} dias grátis, sem cartão e sem fidelidade.</p>
      <LinkCadastro grande>Criar conta grátis</LinkCadastro>
    </section>
  );
}

function OutrosComparativos({ atual }: { atual?: string }) {
  const links = [
    ...CONCORRENTES.filter((c) => c.slug !== atual).map((c) => ({
      href: `/comparativo/${c.slug}`,
      rotulo: `Pente Fino ou ${c.nome}`,
    })),
    ...(atual
      ? [{ href: '/melhor-sistema-para-barbearia', rotulo: 'Como escolher o sistema' }]
      : []),
  ];
  return (
    <nav
      aria-label="Outras comparações"
      className="mx-auto max-w-6xl border-t border-borda px-4 py-10 sm:px-6"
    >
      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-flex min-h-9 items-center text-tinta underline underline-offset-4"
            >
              {l.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const Lista = ({ titulo, itens }: { titulo: string; itens: readonly string[] }) => (
  <div className="flex flex-col gap-3">
    <h2 className="font-denso text-3xl font-bold uppercase">{titulo}</h2>
    <ul className="flex list-disc flex-col gap-2 pl-5 text-tinta-suave">
      {itens.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  </div>
);

/** /comparativo/<slug>: Pente Fino ou um concorrente. */
export function PaginaComparativo({ c }: { c: Concorrente }) {
  const caminho = `/comparativo/${c.slug}`;
  return (
    <>
      <TrilhaGoogle pagina={`Pente Fino ou ${c.nome}`} caminho={caminho} />
      <Cabecalho
        sobre="Comparação"
        titulo={`Pente Fino ou ${c.nome}?`}
        texto={`Os dois organizam a agenda da barbearia. A diferença está no que cada um mostra depois do atendimento e em como cobra. Aqui vai o que cada página oficial diz.`}
      />
      <div className="mx-auto flex max-w-4xl flex-col gap-12 px-4 pb-14 sm:px-6">
        <section className="flex flex-col gap-4" aria-labelledby="lado-a-lado">
          <h2 id="lado-a-lado" className="font-denso text-3xl font-bold uppercase">
            Lado a lado
          </h2>
          <Tabela
            legenda={`Pente Fino e ${c.nome} lado a lado`}
            colunas={['', 'Pente Fino', c.nome]}
            linhas={[
              [
                'Como cobra',
                `Por plano: ${COMPLETOS.map((p) => `${NOME_PLANO[p]} ${formatarMoeda(precoPorMes(p, 'mensal'))}`).join(', ')} no mensal, com desconto no anual.`,
                c.comoCobra,
              ],
              ...EQUIPES.map((n) => [
                `${n} ${n === 1 ? 'barbeiro' : 'barbeiros'}, por mês`,
                penteFinoPara(n),
                valor(c.custo[n]),
              ]),
              ['Teste grátis', `${DIAS_TESTE} dias, sem cartão`, valor(c.teste)],
              ['WhatsApp', PENTE_FINO.whatsapp, valor(c.whatsapp)],
              ['Comissão', PENTE_FINO.comissao, valor(c.comissao)],
              ['Lucro por serviço', PENTE_FINO.lucroPorServico, valor(c.lucroPorServico)],
              ['Nota fiscal', PENTE_FINO.notaFiscal, valor(c.notaFiscal)],
              ['App nas lojas', PENTE_FINO.appNasLojas, valor(c.appNasLojas)],
            ]}
          />
        </section>
        {/* Pedido do dono em 15/11: sem fazer propaganda do concorrente (a lista do que ele faz
            melhor fica só nos dados, fora da página). */}
        <Lista titulo="Por que o Pente Fino" itens={c.ondePenteFinoEMelhor} />
      </div>
      <Fontes itens={[c]} />
      <Chamada />
      <OutrosComparativos atual={c.slug} />
    </>
  );
}

const SINAL = {
  sim: { Icone: Check, texto: 'Sim', cor: 'text-acao-texto' },
  parte: { Icone: Contrast, texto: 'Em parte', cor: 'text-aviso-texto' },
  nao: { Icone: X, texto: 'Não', cor: 'text-tinta-fraca' },
} as const;

function CelulaSinal({ sinal }: { sinal: Sinal }) {
  if (!sinal.s) return <NaoInforma />;
  const { Icone, texto, cor } = SINAL[sinal.s];
  return (
    <span className="inline-flex flex-col items-center gap-0.5">
      <Icone aria-label={texto} className={`size-5 ${cor}`} />
      {sinal.nota && <span className="text-xs leading-tight text-tinta-suave">{sinal.nota}</span>}
    </span>
  );
}

const COLUNAS_RESUMO = [
  ['preco3', '3 barbeiros por mês'],
  ['teste', 'Teste grátis'],
  ['whatsapp', 'WhatsApp no plano'],
  ['comissao', 'Comissão automática'],
  ['lucro', 'Lucro de cada serviço'],
  ['notaFiscal', 'Nota fiscal'],
  ['app', 'App nas lojas'],
] as const;

/**
 * Tabela geral de bater o olho (pedido do dono em 15/11: a de antes era grande e difícil): um
 * sistema por linha, um sinal e no máximo duas palavras por célula; o detalhe fica na página de
 * cada um, no link do nome.
 */
function TabelaResumo() {
  const linhas = [
    {
      nome: 'Pente Fino',
      href: null,
      resumo: {
        ...PENTE_FINO_RESUMO,
        preco3: `${formatarMoeda(precoPorMes('basico', 'mensal'))}`,
        teste: `${DIAS_TESTE} dias`,
      },
    },
    ...CONCORRENTES.map((c) => ({
      nome: c.nome,
      href: `/comparativo/${c.slug}`,
      resumo: c.resumo,
    })),
  ];
  return (
    <div className="flex flex-col gap-3">
      <div
        role="region"
        aria-label="Os sistemas lado a lado, role para o lado"
        tabIndex={0}
        className="dica-rolagem overflow-x-auto rounded-xl border border-borda focus-visible:outline-2 focus-visible:outline-foco"
      >
        <table className="w-full min-w-[46rem] text-center text-sm">
          <caption className="sr-only">
            Pente Fino, {CONCORRENTES.map((c) => c.nome).join(', ')} lado a lado
          </caption>
          <thead className="bg-superficie-2">
            <tr>
              <th scope="col" className="sticky left-0 bg-superficie-2 px-4 py-3 text-left">
                <span className="sr-only">Sistema</span>
              </th>
              {COLUNAS_RESUMO.map(([, rotulo]) => (
                <th key={rotulo} scope="col" className="px-3 py-3 font-semibold leading-tight">
                  {rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-borda">
            {linhas.map((l) => (
              <tr key={l.nome} className={l.href ? '' : 'bg-modulo/5'}>
                <th
                  scope="row"
                  className={`sticky left-0 px-4 py-3 text-left font-semibold whitespace-nowrap ${l.href ? 'bg-fundo' : 'bg-superficie font-denso text-base text-modulo-texto uppercase'}`}
                >
                  {l.href ? (
                    <Link href={l.href} className="underline underline-offset-4">
                      {l.nome}
                    </Link>
                  ) : (
                    l.nome
                  )}
                </th>
                {COLUNAS_RESUMO.map(([chave]) => {
                  const v = l.resumo[chave];
                  return (
                    <td key={chave} className="px-3 py-3 align-middle">
                      {typeof v === 'string' || v === null ? (
                        v ? (
                          <span className="font-medium whitespace-nowrap">{v}</span>
                        ) : (
                          <NaoInforma />
                        )
                      ) : (
                        <CelulaSinal sinal={v} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-tinta-suave">
        <span className="inline-flex items-center gap-1">
          <Check aria-hidden className="size-4 text-acao-texto" /> sim
        </span>
        <span className="inline-flex items-center gap-1">
          <Contrast aria-hidden className="size-4 text-aviso-texto" /> em parte ou pago à parte
        </span>
        <span className="inline-flex items-center gap-1">
          <X aria-hidden className="size-4 text-tinta-fraca" /> não
        </span>
        <span>— o site do sistema não informa</span>
        <span>Clique no nome para ver o detalhe.</span>
      </p>
    </div>
  );
}

/** /melhor-sistema-para-barbearia: como escolher e a tabela com todos. */
export function PaginaComparativoGeral() {
  return (
    <>
      <TrilhaGoogle
        pagina="Melhor sistema para barbearia"
        caminho="/melhor-sistema-para-barbearia"
      />
      <Cabecalho
        sobre="Como escolher"
        titulo="Melhor sistema para barbearia: como escolher o seu"
        texto="Não existe um melhor para todo mundo. Existe o que cabe no tamanho da sua equipe e responde a pergunta que importa para você. Antes de testar, faça estas perguntas e compare com a tabela."
      />
      <div className="mx-auto flex max-w-4xl flex-col gap-12 px-4 pb-14 sm:px-6">
        <Lista
          titulo="Cinco perguntas antes de escolher"
          itens={[
            'Quanto vou pagar com a equipe que tenho hoje e com a que quero ter? Some as taxas por profissional e os itens adicionais.',
            'O lembrete e o WhatsApp vêm no plano ou são cobrados à parte?',
            'A comissão sai sozinha, item a item, ou ainda vou precisar de planilha?',
            'O sistema mostra só o faturamento ou também quanto sobra depois de comissão, produto e despesas?',
            'O teste dá tempo de usar num mês de verdade? Precisa de cartão?',
          ]}
        />
        <section className="flex flex-col gap-4" aria-labelledby="tabela-geral">
          <h2 id="tabela-geral" className="font-denso text-3xl font-bold uppercase">
            Os sistemas lado a lado
          </h2>
          <TabelaResumo />
        </section>
      </div>
      <Fontes itens={CONCORRENTES} />
      <Chamada />
      <OutrosComparativos />
    </>
  );
}
