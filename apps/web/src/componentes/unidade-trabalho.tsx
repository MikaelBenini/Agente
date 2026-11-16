'use client';

import { Selecao } from '@pente-fino/ui';
import { useState, useSyncExternalStore } from 'react';
import { useApp } from './contexto-app';

/** A escolha vale entre Agenda, Comandas e Caixa enquanto a aba estiver aberta. */
const CHAVE = 'pente-fino:unidade-trabalho';

function lerEscolha(): string | null {
  try {
    return sessionStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

const semAvisos = () => () => undefined;

function guardarEscolha(id: string) {
  try {
    sessionStorage.setItem(CHAVE, id);
  } catch {
    // Sem armazenamento (aba privada): a escolha vale só nesta tela.
  }
}

/**
 * Telas do dia a dia (agenda, comandas, caixa) trabalham numa unidade. Com
 * "Todas as unidades" ativa, mostra um seletor; senão usa a unidade ativa.
 * Revisão de 16/11/2026: com "Todas as unidades" no alto, o seletor diz qual unidade a tela
 * mostra e onde o agendamento, a comanda ou o caixa ficam registrados.
 */
export function useUnidadeTrabalho(): { unidadeId: string | null; seletor: React.ReactNode } {
  const { unidades, unidadeAtiva } = useApp();
  const ativas = unidades.filter((u) => u.ativa);
  // A escolhida nesta tela vale; antes de escolher, a guardada na aba (no servidor, nenhuma).
  const guardada = useSyncExternalStore(semAvisos, lerEscolha, () => null);
  const [escolhaDaTela, setEscolhida] = useState<string | null>(null);
  const escolhida = escolhaDaTela ?? guardada;
  if (unidadeAtiva !== 'todas') return { unidadeId: unidadeAtiva, seletor: null };
  const unidadeId =
    (escolhida && ativas.some((u) => u.id === escolhida) ? escolhida : null) ??
    ativas[0]?.id ??
    null;
  const nome = ativas.find((u) => u.id === unidadeId)?.nome ?? '';
  return {
    unidadeId,
    seletor:
      ativas.length > 1 ? (
        <div className="w-full max-w-sm">
          <Selecao
            id="unidade-trabalho"
            rotulo="Unidade desta tela"
            dica={`No alto está "Todas as unidades"; esta tela mostra a ${nome}, e o que você lançar aqui fica nela.`}
            value={unidadeId ?? ''}
            onChange={(e) => {
              setEscolhida(e.target.value);
              guardarEscolha(e.target.value);
            }}
            opcoes={ativas.map((u) => ({ valor: u.id, rotulo: u.nome }))}
          />
        </div>
      ) : null,
  };
}
