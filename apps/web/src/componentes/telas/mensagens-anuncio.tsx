'use client';

import { FLUXO_ANUNCIO_PADRAO, type FluxoAnuncio } from '@pente-fino/shared';
import { Botao, CampoTexto, Marcador } from '@pente-fino/ui';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api, ErroApi } from '@/lib/api';
import { chaveBot, useAcao } from '@/lib/consultas';
import { Aviso } from '../aviso';
import { Estado } from '../pagina';

const chave = [...chaveBot, 'anuncio'] as const;
const MAX_ETAPAS = 5;

/**
 * Mensagens automáticas de quem vem de anúncio (pedido do dono em 16/11/2026): quem chega por um
 * anúncio do Facebook/Instagram (clique para o WhatsApp), ou escreve a frase pronta do anúncio,
 * recebe estas mensagens em sequência, sem o menu do bot, e depois passa para a equipe.
 */
export function MensagensDeAnuncio({ podeEditar }: { podeEditar: boolean }) {
  const fluxo = useQuery({ queryKey: chave, queryFn: () => api<FluxoAnuncio>('bot/anuncio') });
  return (
    <Estado consulta={fluxo}>
      {() => <Formulario inicial={fluxo.data!} podeEditar={podeEditar} />}
    </Estado>
  );
}

function Formulario({ inicial, podeEditar }: { inicial: FluxoAnuncio; podeEditar: boolean }) {
  const [f, setF] = useState<FluxoAnuncio>(inicial);
  const [frases, setFrases] = useState(inicial.frases.join('\n'));
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const salvar = useAcao(
    (d: FluxoAnuncio) => api<FluxoAnuncio>('bot/anuncio', { metodo: 'PUT', corpo: d }),
    [chave],
  );
  const enviar = async (ev: FormEvent) => {
    ev.preventDefault();
    setErro(null);
    setOk(false);
    try {
      await salvar.mutateAsync({
        ...f,
        frases: frases
          .split('\n')
          .map((x) => x.trim())
          .filter(Boolean),
      });
      setOk(true);
    } catch (e) {
      setErro(
        e instanceof ErroApi
          ? (e.campos[0]?.mensagem ?? e.message)
          : 'Não deu para salvar. Tente de novo.',
      );
    }
  };
  const mudarEtapa = (i: number, texto: string) =>
    setF({ ...f, etapas: f.etapas.map((e, j) => (j === i ? texto : e)) });

  return (
    <form onSubmit={enviar} className="flex max-w-3xl flex-col gap-5">
      <p className="text-tinta-suave">
        Para quem chega por um anúncio do Facebook ou do Instagram que abre o WhatsApp. O bot manda
        estas mensagens em sequência, esperando a resposta do cliente depois de cada uma, e no fim
        passa a conversa para a equipe. Em Conversas, a conversa aparece marcada &quot;Veio de
        anúncio&quot;, com as respostas do cliente.
      </p>
      <fieldset disabled={!podeEditar} className="flex min-w-0 flex-col gap-5">
        <Marcador
          id="anuncio-ativo"
          rotulo="Ligar as mensagens automáticas de anúncio"
          checked={f.ativo}
          onChange={(e) => setF({ ...f, ativo: e.target.checked })}
        />
        <CampoTexto
          id="anuncio-frases"
          rotulo="Frases prontas do anúncio (uma por linha)"
          dica='A mensagem que o anúncio deixa escrita para o cliente, como "Olá! Quero saber mais.". O WhatsApp normalmente já avisa que veio do anúncio; a frase garante quando ele não avisa.'
          rows={3}
          value={frases}
          onChange={(e) => setFrases(e.target.value)}
        />
        <ol className="flex flex-col gap-4">
          {f.etapas.map((texto, i) => (
            <li key={i} className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <CampoTexto
                  id={`anuncio-etapa-${i}`}
                  rotulo={`Mensagem ${i + 1}${i === 0 ? ' (a primeira resposta)' : ''}`}
                  rows={2}
                  value={texto}
                  onChange={(e) => mudarEtapa(i, e.target.value)}
                />
              </div>
              {f.etapas.length > 1 && (
                <Botao
                  variante="fantasma"
                  aria-label={`Tirar a mensagem ${i + 1}`}
                  onClick={() => setF({ ...f, etapas: f.etapas.filter((_, j) => j !== i) })}
                >
                  <Trash2 aria-hidden className="size-5" />
                </Botao>
              )}
            </li>
          ))}
        </ol>
        {f.etapas.length < MAX_ETAPAS && (
          <Botao
            variante="secundario"
            className="self-start"
            onClick={() => setF({ ...f, etapas: [...f.etapas, ''] })}
          >
            <Plus aria-hidden className="size-5" /> Mais uma mensagem
          </Botao>
        )}
        <CampoTexto
          id="anuncio-final"
          rotulo="Mensagem final (passa para a equipe)"
          rows={2}
          value={f.final}
          onChange={(e) => setF({ ...f, final: e.target.value })}
        />
        <p className="text-sm text-tinta-suave">
          Use {'{cliente}'} para o primeiro nome de quem a barbearia já conhece (sem nome, some).
        </p>
      </fieldset>
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {ok && (
        <Aviso tom="sucesso">
          {f.ativo
            ? 'Salvo. Quem vier de anúncio já recebe estas mensagens.'
            : 'Salvo. As mensagens de anúncio estão desligadas.'}
        </Aviso>
      )}
      {podeEditar && (
        <div className="flex flex-wrap gap-2">
          <Botao type="submit" carregando={salvar.isPending}>
            Salvar mensagens automáticas
          </Botao>
          <Botao
            variante="secundario"
            onClick={() => {
              setF({ ...FLUXO_ANUNCIO_PADRAO, ativo: f.ativo } as FluxoAnuncio);
              setFrases(FLUXO_ANUNCIO_PADRAO.frases.join('\n'));
            }}
          >
            Usar o texto sugerido
          </Botao>
        </div>
      )}
      <p className="text-sm text-tinta-suave">
        Teste em Testar, marcando &quot;Chegou por anúncio&quot;.
      </p>
    </form>
  );
}
