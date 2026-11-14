'use client';

import { temRecurso, type PlanoConta, type Recurso } from '@pente-fino/shared';
import { useSituacaoConta } from './consultas';

/** Plano da conta (undefined enquanto carrega). */
export function usePlano(): PlanoConta | undefined {
  return useSituacaoConta().data?.plano;
}

/** O plano tem o recurso? undefined enquanto carrega (não chamar a API do recurso ainda). */
export function useTemRecurso(r: Recurso): boolean | undefined {
  const situacao = useSituacaoConta().data;
  return situacao === undefined ? undefined : temRecurso(situacao.plano, r, situacao.automacoes);
}
