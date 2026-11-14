'use client';

// Depoimentos da página de vendas (pedido do dono em 14/11): cola o link do Instagram, o sistema
// tenta puxar o nome e a foto; o dono escreve o que a pessoa disse e a data. Só depoimento real,
// com autorização de quem falou.
import { dataLocal, type DepoimentoNaTela, type PerfilInstagram } from '@pente-fino/shared';
import { Botao, Campo, CampoTexto } from '@pente-fino/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ErroApi } from '@/lib/api';
import { Aviso } from '../aviso';
import { Estado } from '../pagina';
import { adminApi } from './admin-api';

const CHAVE = ['admin', 'depoimentos'];
const mensagem = (e: unknown) =>
  e instanceof ErroApi ? e.message : 'Não deu certo. Tente de novo.';

/** A foto reduzida no navegador (até 480 px, JPEG): cabe folgada no limite do envio. */
async function fotoReduzida(f: File): Promise<string> {
  const bitmap = await createImageBitmap(f);
  const escala = Math.min(1, 480 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export function DepoimentosAdmin() {
  const cliente = useQueryClient();
  const lista = useQuery({
    queryKey: CHAVE,
    queryFn: () => adminApi<DepoimentoNaTela[]>('depoimentos'),
  });
  const atualizar = () => cliente.invalidateQueries({ queryKey: CHAVE });
  return (
    <section aria-labelledby="titulo-depoimentos-admin" className="flex flex-col gap-4">
      <div>
        <h2 id="titulo-depoimentos-admin" className="text-2xl font-semibold">
          Depoimentos da página de vendas
        </h2>
        <p className="text-sm text-tinta-suave">
          Passam num carrossel na página inicial. Só depoimento real, com autorização de quem
          falou.
        </p>
      </div>
      <NovoDepoimento onSalvo={atualizar} />
      <Estado consulta={lista}>
        {() =>
          lista.data!.length === 0 ? (
            <p className="text-tinta-suave">Nenhum depoimento ainda.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {lista.data!.map((d) => (
                <ItemDepoimento key={d.id} d={d} onMudou={atualizar} />
              ))}
            </ul>
          )
        }
      </Estado>
    </section>
  );
}

const vazio = () => ({ instagram: '', nome: '', quem: '', texto: '', data: dataLocal(new Date()) });

function NovoDepoimento({ onSalvo }: { onSalvo: () => Promise<void> }) {
  const [f, setF] = useState(vazio);
  const [perfil, setPerfil] = useState<PerfilInstagram | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function buscar() {
    setErro(null);
    setPerfil(null);
    try {
      const p = await adminApi<PerfilInstagram>('depoimentos/instagram', {
        corpo: { instagram: f.instagram },
      });
      setPerfil(p);
      if (p.nome && !f.nome) setF((x) => ({ ...x, nome: p.nome! }));
    } catch (e) {
      setErro(mensagem(e));
    }
  }

  async function salvar() {
    setErro(null);
    setOk(null);
    setEnviando(true);
    try {
      const d = await adminApi<DepoimentoNaTela>('depoimentos', { corpo: f });
      setOk(
        d.foto
          ? 'Depoimento salvo, com a foto do Instagram.'
          : 'Depoimento salvo. O Instagram não deixou puxar a foto: envie uma na lista abaixo.',
      );
      setF(vazio());
      setPerfil(null);
      await onSalvo();
    } catch (e) {
      setErro(mensagem(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      aria-label="Novo depoimento"
      className="flex flex-col gap-3 rounded-lg border border-borda bg-superficie p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void salvar();
      }}
    >
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-64 flex-1">
          <Campo
            id="dep-instagram"
            rotulo="Link ou @ do Instagram"
            autoComplete="off"
            value={f.instagram}
            onChange={(e) => setF({ ...f, instagram: e.target.value })}
          />
        </div>
        <Botao type="button" variante="secundario" onClick={() => void buscar()}>
          Buscar no Instagram
        </Botao>
      </div>
      {perfil && (
        <p role="status" className="text-sm text-tinta-suave">
          @{perfil.perfil}: {perfil.nome ? `nome "${perfil.nome}"` : 'o nome não veio'}
          {perfil.temFoto ? ', com foto.' : ', sem foto (dá para enviar depois de salvar).'}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo
          id="dep-nome"
          rotulo="Nome"
          value={f.nome}
          onChange={(e) => setF({ ...f, nome: e.target.value })}
        />
        <Campo
          id="dep-quem"
          rotulo="Barbearia e cidade (opcional)"
          value={f.quem}
          onChange={(e) => setF({ ...f, quem: e.target.value })}
        />
        <Campo
          id="dep-data"
          rotulo="Data"
          type="date"
          value={f.data}
          onChange={(e) => setF({ ...f, data: e.target.value })}
        />
      </div>
      <CampoTexto
        id="dep-texto"
        rotulo="O que a pessoa disse sobre o sistema"
        rows={3}
        value={f.texto}
        onChange={(e) => setF({ ...f, texto: e.target.value })}
      />
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {ok && <Aviso tom="sucesso">{ok}</Aviso>}
      <Botao type="submit" carregando={enviando} className="self-start">
        Salvar depoimento
      </Botao>
    </form>
  );
}

function ItemDepoimento({ d, onMudou }: { d: DepoimentoNaTela; onMudou: () => Promise<void> }) {
  const [erro, setErro] = useState<string | null>(null);
  const corpo = { instagram: d.instagram, nome: d.nome, quem: d.quem, texto: d.texto, data: d.data };
  async function agir(fn: () => Promise<unknown>) {
    setErro(null);
    try {
      await fn();
      await onMudou();
    } catch (e) {
      setErro(mensagem(e));
    }
  }
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-borda bg-superficie p-4">
      <div className="flex items-start gap-3">
        {d.foto ? (
          <img src={d.foto} alt="" className="size-12 rounded-full object-cover" />
        ) : (
          <span
            aria-hidden
            className="grid size-12 shrink-0 place-items-center rounded-full bg-superficie-3 font-bold"
          >
            {d.nome.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {d.nome} <span className="font-normal text-tinta-suave">@{d.instagram}</span>
            {!d.ativo && <span className="ml-2 text-sm text-tinta-suave">(escondido)</span>}
          </p>
          <p className="text-sm text-tinta-suave">{[d.quem, d.data].filter(Boolean).join(', ')}</p>
          <p className="mt-1">“{d.texto}”</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-borda px-3 text-sm font-semibold hover:bg-superficie-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-foco">
          {d.foto ? 'Trocar a foto' : 'Enviar a foto'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={async (e) => {
              const arquivo = e.target.files?.[0];
              if (!arquivo) return;
              await agir(async () =>
                adminApi(`depoimentos/${d.id}/foto`, {
                  metodo: 'PUT',
                  corpo: { tipo: 'image/jpeg', base64: await fotoReduzida(arquivo) },
                }),
              );
            }}
          />
        </label>
        <Botao
          variante="secundario"
          onClick={() =>
            agir(() =>
              adminApi(`depoimentos/${d.id}`, {
                metodo: 'PUT',
                corpo: { ...corpo, ativo: !d.ativo },
              }),
            )
          }
        >
          {d.ativo ? 'Esconder' : 'Mostrar no site'}
        </Botao>
        <Botao
          variante="secundario"
          onClick={() => agir(() => adminApi(`depoimentos/${d.id}`, { metodo: 'DELETE' }))}
        >
          Apagar
        </Botao>
      </div>
      {erro && <Aviso tom="erro">{erro}</Aviso>}
    </li>
  );
}
