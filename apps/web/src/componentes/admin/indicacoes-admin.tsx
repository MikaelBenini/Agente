'use client';

// Indique e ganhe na administração (regras de 14/11): quem tem Pix liberado para receber (a
// partir de R$ 50) e os meses grátis para aplicar na assinatura de quem é cliente.
import { formatarMoeda, MINIMO_SAQUE, type IndicadorNaAdmin } from '@pente-fino/shared';
import { Botao } from '@pente-fino/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ErroApi } from '@/lib/api';
import { Aviso } from '../aviso';
import { Estado, Tabela, td, th } from '../pagina';
import { adminApi } from './admin-api';

const CHAVE = ['admin', 'indicacoes'];

export function IndicacoesAdmin() {
  const cliente = useQueryClient();
  const q = useQuery({ queryKey: CHAVE, queryFn: () => adminApi<IndicadorNaAdmin[]>('indicacoes') });
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  async function pagar(i: IndicadorNaAdmin) {
    setErro(null);
    setOk(null);
    try {
      const r = await adminApi<{ total: number }>(`indicacoes/${i.id}/pagar`, { corpo: {} });
      setOk(`Pix de ${formatarMoeda(r.total)} para ${i.nome} marcado como pago.`);
      await cliente.invalidateQueries({ queryKey: CHAVE });
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não deu certo.');
    }
  }
  return (
    <section aria-labelledby="titulo-indicacoes" className="flex flex-col gap-3">
      <h2 id="titulo-indicacoes" className="text-2xl font-semibold">
        Indique e ganhe
      </h2>
      <p className="text-sm text-tinta-suave">
        O Pix sai uma vez por mês, a partir de {formatarMoeda(MINIMO_SAQUE)} liberados (30 dias
        depois do pagamento da indicada). Faça o Pix pela chave e marque como pago. Os meses
        grátis de quem é cliente entram como desconto na próxima cobrança.
      </p>
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {ok && <Aviso tom="sucesso">{ok}</Aviso>}
      <Estado consulta={q}>
        {() =>
          q.data!.length === 0 ? (
            <p className="text-tinta-suave">Ninguém se cadastrou para indicar ainda.</p>
          ) : (
            <Tabela rotulo="Quem indica">
              <thead>
                <tr className="border-b border-borda">
                  {['Quem indica', 'Indicadas', 'Liberado', 'A liberar', 'Pago', 'Meses', ''].map(
                    (c) => (
                      <th key={c} scope="col" className={th}>
                        {c}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {q.data!.map((i) => (
                  <tr key={i.id} className="border-b border-borda">
                    <th scope="row" className={`${td} font-normal`}>
                      <span className="font-semibold">{i.nome}</span>
                      {i.cliente && <span className="ml-1 text-sm text-tinta-suave">(cliente)</span>}
                      <span className="block text-sm text-tinta-suave">
                        {i.email}
                        {i.recebe === 'pix' && i.chavePix ? `, Pix: ${i.chavePix}` : ''}
                      </span>
                    </th>
                    <td className={`${td} tabular-nums`}>{i.indicadas}</td>
                    <td className={`${td} tabular-nums`}>{formatarMoeda(i.resumo.liberado)}</td>
                    <td className={`${td} tabular-nums`}>{formatarMoeda(i.resumo.aLiberar)}</td>
                    <td className={`${td} tabular-nums`}>{formatarMoeda(i.resumo.pago)}</td>
                    <td className={`${td} tabular-nums`}>
                      {i.resumo.mesesGanhos > 0
                        ? `${i.resumo.mesesAplicados} de ${i.resumo.mesesGanhos} aplicados`
                        : '—'}
                    </td>
                    <td className={td}>
                      {i.resumo.podeReceber && (
                        <Botao variante="secundario" onClick={() => pagar(i)}>
                          Marcar Pix pago
                        </Botao>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Tabela>
          )
        }
      </Estado>
    </section>
  );
}
