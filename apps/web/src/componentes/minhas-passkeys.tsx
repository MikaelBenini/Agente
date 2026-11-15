'use client';

import { formatarData, type PasskeyNaTela } from '@pente-fino/shared';
import { Botao, ModalConfirmacao } from '@pente-fino/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Cloud, KeyRound, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { api, ErroApi } from '@/lib/api';
import { useHidratado } from '@/lib/hidratado';
import { criarPasskey, temPasskey } from '@/lib/passkey';
import { Aviso } from './aviso';

const chave = ['me', 'passkeys'] as const;

/**
 * Perfil → Entrar sem senha (passkey, pedido do dono em 15/11): criar no aparelho, ver e apagar.
 * Sem suporte no navegador, a seção explica e não oferece o botão.
 */
export function MinhasPasskeys() {
  const cliente = useQueryClient();
  const hidratado = useHidratado();
  const lista = useQuery({ queryKey: chave, queryFn: () => api<PasskeyNaTela[]>('me/passkeys') });
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [apagar, setApagar] = useState<PasskeyNaTela | null>(null);
  const suporta = hidratado && temPasskey();

  async function criar() {
    setErro(null);
    setOk(null);
    setOcupado(true);
    try {
      const nova = await criarPasskey();
      if (nova) {
        setOk(`Pronto: da próxima vez, entre com a passkey (${nova.nome}).`);
        await cliente.invalidateQueries({ queryKey: chave });
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu para criar a passkey.');
    } finally {
      setOcupado(false);
    }
  }

  async function confirmarApagar() {
    if (!apagar) return;
    setOcupado(true);
    try {
      await api(`me/passkeys/${apagar.id}`, { metodo: 'DELETE' });
      setApagar(null);
      await cliente.invalidateQueries({ queryKey: chave });
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não deu para apagar.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="titulo-passkeys">
      <h2
        id="titulo-passkeys"
        className="text-xs font-semibold uppercase tracking-wider text-tinta-suave"
      >
        Entrar sem senha
      </h2>
      <div className="flex flex-col gap-4 rounded-lg border border-borda bg-superficie p-4">
        <p className="text-tinta-suave">
          Com a passkey, você entra com a digital, o rosto ou o PIN do aparelho, sem digitar a
          senha. Ela fica guardada no celular ou no gerenciador de senhas, e ninguém consegue usar
          num site falso.
        </p>
        {lista.data && lista.data.length > 0 && (
          <ul className="flex flex-col divide-y divide-borda rounded-md border border-borda">
            {lista.data.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-3">
                  {p.sincronizada ? (
                    <Cloud aria-hidden className="size-5 shrink-0 text-tinta-suave" />
                  ) : (
                    <Smartphone aria-hidden className="size-5 shrink-0 text-tinta-suave" />
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold">{p.nome}</span>
                    <span className="text-sm text-tinta-suave">
                      {p.sincronizada ? 'Nos seus aparelhos' : 'Só neste aparelho'} · criada em{' '}
                      {formatarData(p.criadaEm)}
                      {p.usadaEm ? ` · usada em ${formatarData(p.usadaEm)}` : ''}
                    </span>
                  </span>
                </span>
                <Botao variante="fantasma" onClick={() => setApagar(p)}>
                  Apagar
                </Botao>
              </li>
            ))}
          </ul>
        )}
        {suporta ? (
          <Botao className="self-start" carregando={ocupado} onClick={() => void criar()}>
            <KeyRound aria-hidden className="size-5" /> Criar passkey neste aparelho
          </Botao>
        ) : (
          hidratado && (
            <p className="text-sm text-tinta-suave">
              Este navegador ainda não cria passkey. No celular, use o Chrome ou o Safari
              atualizado.
            </p>
          )
        )}
        {ok && (
          <p role="status" className="text-sm text-tinta-suave">
            {ok}
          </p>
        )}
        {erro && <Aviso tom="erro">{erro}</Aviso>}
      </div>
      <ModalConfirmacao
        aberto={!!apagar}
        titulo="Apagar esta passkey?"
        descricao="Ela para de funcionar aqui. Para tirar também do aparelho, apague no gerenciador de senhas dele."
        textoConfirmar="Apagar"
        tom="perigo"
        carregando={ocupado}
        onConfirmar={() => void confirmarApagar()}
        onCancelar={() => setApagar(null)}
      />
    </section>
  );
}
