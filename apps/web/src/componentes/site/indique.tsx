'use client';

// Indique e ganhe (regras do dono em 14/11): qualquer pessoa se cadastra e ganha um link; quem
// indica recebe 20% das mensalidades da barbearia indicada nos 12 primeiros meses. O painel abre
// pelo link secreto mostrado uma vez no cadastro (guarde-o).
import {
  formatarMoeda,
  MINIMO_SAQUE,
  type CadastroIndicadorEntrada,
  type PainelIndicador,
} from '@pente-fino/shared';
import { Botao, Campo } from '@pente-fino/ui';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import { api, ErroApi } from '@/lib/api';
import { Aviso } from '../aviso';
import { CampoDocumento } from '../campos';

function Copiar({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md border border-borda bg-fundo px-3 py-2 text-sm">
        {texto}
      </code>
      <Botao
        type="button"
        variante="secundario"
        onClick={async () => {
          await navigator.clipboard?.writeText(texto).catch(() => undefined);
          setOk(true);
        }}
        aria-label={rotulo}
      >
        <Copy aria-hidden className="size-4" /> {ok ? 'Copiado' : 'Copiar'}
      </Botao>
    </div>
  );
}

export function CadastroIndicador() {
  const [f, setF] = useState<CadastroIndicadorEntrada>({
    nome: '',
    email: '',
    cpf: '',
    chavePix: '',
  });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState<{ link: string; token: string } | null>(null);

  if (feito) {
    const painel = `${window.location.origin}/indique/painel?t=${feito.token}`;
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-modulo/50 bg-superficie p-6">
        <h2 className="text-2xl font-semibold">Pronto, seu link está aqui</h2>
        <p className="text-tinta-suave">Mande para os barbeiros que você conhece:</p>
        <Copiar texto={feito.link} rotulo="Copiar o link de indicação" />
        <p className="text-tinta-suave">
          E guarde o link do seu painel, onde você acompanha as indicações e as comissões. Ele só
          aparece agora:
        </p>
        <Copiar texto={painel} rotulo="Copiar o link do painel" />
        <a href={painel} className="font-semibold underline underline-offset-4">
          Abrir o painel
        </a>
      </div>
    );
  }

  return (
    <form
      aria-label="Quero indicar"
      className="flex flex-col gap-3 rounded-2xl border border-borda bg-superficie p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setErro(null);
        setEnviando(true);
        try {
          setFeito(await api('publico/indicadores', { corpo: f }));
        } catch (er) {
          setErro(er instanceof ErroApi ? er.message : 'Não deu certo. Tente de novo.');
        } finally {
          setEnviando(false);
        }
      }}
    >
      <h2 className="text-2xl font-semibold">Quero indicar</h2>
      <Campo
        id="ind-nome"
        rotulo="Seu nome"
        autoComplete="name"
        value={f.nome}
        onChange={(e) => setF({ ...f, nome: e.target.value })}
      />
      <Campo
        id="ind-email"
        rotulo="E-mail"
        type="email"
        autoComplete="email"
        value={f.email}
        onChange={(e) => setF({ ...f, email: e.target.value })}
      />
      <CampoDocumento
        id="ind-cpf"
        rotulo="CPF (para o Pix)"
        soCpf
        valor={f.cpf}
        onValor={(v) => setF({ ...f, cpf: v })}
      />
      <Campo
        id="ind-pix"
        rotulo="Chave Pix"
        autoComplete="off"
        value={f.chavePix}
        onChange={(e) => setF({ ...f, chavePix: e.target.value })}
      />
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      <Botao type="submit" carregando={enviando} className="self-start">
        Gerar meu link
      </Botao>
    </form>
  );
}

/** O painel aberto pelo link secreto (?t=). */
export function PainelPeloLink() {
  return <PainelDoIndicador token={useSearchParams().get('t') ?? ''} />;
}

/** O painel de quem indica: indicadas, comissões e o que vem no próximo Pix. */
export function PainelDoIndicador({ token }: { token: string }) {
  const q = useQuery({
    queryKey: ['indicador', 'painel', token],
    queryFn: async () => {
      const r = await fetch('/api/publico/indicadores/painel', {
        headers: { 'x-indicador-token': token },
      });
      if (!r.ok) throw new Error('Link do painel inválido.');
      return (await r.json()) as PainelIndicador;
    },
    retry: false,
    enabled: !!token,
  });
  if (!token || q.isError)
    return <Aviso tom="erro">Link do painel inválido. Use o link que apareceu no cadastro.</Aviso>;
  if (!q.data) return <p className="text-tinta-suave">Carregando…</p>;
  return <ConteudoPainel p={q.data} link={`${window.location.origin}/cadastro?indicacao=${q.data.codigo}`} />;
}

export function ConteudoPainel({ p, link }: { p: PainelIndicador; link: string }) {
  const r = p.resumo;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-tinta-suave">Seu link de indicação</p>
        <Copiar texto={link} rotulo="Copiar o link de indicação" />
      </div>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-borda bg-superficie p-4">
          <dt className="text-sm text-tinta-suave">Barbearias indicadas</dt>
          <dd className="font-denso text-3xl font-semibold tabular-nums">
            {p.indicadas.pagantes + p.indicadas.emTeste}
          </dd>
          <dd className="text-sm text-tinta-suave">
            {p.indicadas.pagantes} pagando, {p.indicadas.emTeste} em teste
          </dd>
        </div>
        {p.recebe === 'meses' ? (
          <div className="rounded-xl border border-borda bg-superficie p-4">
            <dt className="text-sm text-tinta-suave">Meses grátis ganhos</dt>
            <dd className="font-denso text-3xl font-semibold tabular-nums">{r.mesesGanhos}</dd>
            <dd className="text-sm text-tinta-suave">{r.mesesAplicados} já na sua assinatura</dd>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-borda bg-superficie p-4">
              <dt className="text-sm text-tinta-suave">Liberado</dt>
              <dd className="font-denso text-3xl font-semibold tabular-nums">
                {formatarMoeda(r.liberado)}
              </dd>
              <dd className="text-sm text-tinta-suave">
                {r.podeReceber
                  ? 'Vai no próximo Pix do mês'
                  : `O Pix sai a partir de ${formatarMoeda(MINIMO_SAQUE)}`}
              </dd>
            </div>
            <div className="rounded-xl border border-borda bg-superficie p-4">
              <dt className="text-sm text-tinta-suave">A liberar</dt>
              <dd className="font-denso text-3xl font-semibold tabular-nums">
                {formatarMoeda(r.aLiberar)}
              </dd>
              <dd className="text-sm text-tinta-suave">30 dias depois de cada pagamento</dd>
            </div>
            <div className="rounded-xl border border-borda bg-superficie p-4">
              <dt className="text-sm text-tinta-suave">Já recebido</dt>
              <dd className="font-denso text-3xl font-semibold tabular-nums">
                {formatarMoeda(r.pago)}
              </dd>
            </div>
          </>
        )}
      </dl>
    </div>
  );
}
