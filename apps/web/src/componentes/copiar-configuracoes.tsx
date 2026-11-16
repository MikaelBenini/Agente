'use client';

import {
  ITENS_COPIA_UNIDADE,
  NOME_ITEM_COPIA_UNIDADE,
  type ItemCopiaUnidade,
  type ResultadoCopiaConfiguracoes,
  type UnidadeDetalhe,
} from '@pente-fino/shared';
import { Botao, Dialogo, Marcador, Selecao } from '@pente-fino/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, ErroApi } from '@/lib/api';
import { Aviso } from './aviso';

/** Frase do resultado: o que veio de cada item marcado. */
function textoResultado(r: ResultadoCopiaConfiguracoes): string {
  const partes = ITENS_COPIA_UNIDADE.filter((i) => r[i] !== undefined).map((i) => {
    const n = r[i] ?? 0;
    const nome = NOME_ITEM_COPIA_UNIDADE[i].nome;
    if (i === 'calendario') return `${nome}: ${n} ${n === 1 ? 'dia' : 'dias'}`;
    if (i === 'metas') return `${nome}: ${n} ${n === 1 ? 'meta' : 'metas'}`;
    return `${nome}: ${n ? 'copiado' : 'a outra unidade não tinha'}`;
  });
  return `${partes.join('; ')}.`;
}

/**
 * "Copiar de outra unidade" (aprovado pelo dono em 16/11/2026): escolhe a unidade de origem e o
 * que vem. Mensagens do WhatsApp, menu do bot, equipe e clube já valem para a conta inteira.
 */
export function CopiarConfiguracoes({
  destino,
  unidades,
  onFechar,
}: {
  destino: UnidadeDetalhe;
  unidades: UnidadeDetalhe[];
  onFechar: () => void;
}) {
  const outras = unidades.filter((u) => u.id !== destino.id);
  const [de, setDe] = useState(outras[0]?.id ?? '');
  const [itens, setItens] = useState<ItemCopiaUnidade[]>(
    ITENS_COPIA_UNIDADE.filter((i) => i !== 'metas'),
  );
  const [resultado, setResultado] = useState<string | null>(null);
  const cliente = useQueryClient();
  const copiar = useMutation({
    mutationFn: () =>
      api<ResultadoCopiaConfiguracoes>(`unidades/${destino.id}/copiar-configuracoes`, {
        corpo: { deUnidadeId: de, itens },
      }),
    onSuccess: async (r) => {
      setResultado(textoResultado(r));
      await cliente.invalidateQueries();
    },
  });
  const erro =
    copiar.error instanceof ErroApi
      ? (copiar.error.campos[0]?.mensagem ?? copiar.error.message)
      : copiar.error
        ? 'Não deu para copiar. Tente de novo.'
        : null;
  const nomeDe = outras.find((u) => u.id === de)?.nome ?? '';

  return (
    <Dialogo aberto titulo={`Copiar para ${destino.nome}`} onFechar={onFechar}>
      {resultado ? (
        <div className="flex flex-col gap-4">
          <Aviso tom="sucesso">
            <p className="font-semibold">Copiado de {nomeDe}.</p>
            <p className="mt-1">{resultado}</p>
          </Aviso>
          {itens.includes('site') && (
            <p className="text-sm text-tinta-suave">
              O site foi para o rascunho: confira em Minha página e publique quando quiser.
            </p>
          )}
          <Botao className="self-end" onClick={onFechar}>
            Fechar
          </Botao>
        </div>
      ) : (
        <form
          method="post"
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            copiar.mutate();
          }}
        >
          <Selecao
            id="copiar-de"
            rotulo="Copiar da unidade"
            value={de}
            onChange={(e) => setDe(e.target.value)}
            opcoes={outras.map((u) => ({ valor: u.id, rotulo: u.nome }))}
          />
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-medium">O que vem</legend>
            {ITENS_COPIA_UNIDADE.map((i) => (
              <div key={i}>
                <Marcador
                  id={`copiar-item-${i}`}
                  rotulo={NOME_ITEM_COPIA_UNIDADE[i].nome}
                  checked={itens.includes(i)}
                  onChange={(e) =>
                    setItens(e.target.checked ? [...itens, i] : itens.filter((x) => x !== i))
                  }
                />
                <span className="block pl-8 text-sm text-tinta-suave">
                  {NOME_ITEM_COPIA_UNIDADE[i].detalhe}
                </span>
              </div>
            ))}
          </fieldset>
          <p className="text-sm text-tinta-suave">
            Nunca vêm: endereço, endereço do site, domínio, link do Google e o WhatsApp (cada
            unidade conecta o próprio número). Mensagens do WhatsApp, menu do bot, equipe e clube
            já valem para todas as unidades. O catálogo tem a cópia própria em Serviços.
          </p>
          {erro && <Aviso tom="erro">{erro}</Aviso>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Botao variante="secundario" onClick={onFechar}>
              Cancelar
            </Botao>
            <Botao type="submit" carregando={copiar.isPending} disabled={!de || itens.length === 0}>
              Copiar {itens.length} {itens.length === 1 ? 'item' : 'itens'}
            </Botao>
          </div>
        </form>
      )}
    </Dialogo>
  );
}
