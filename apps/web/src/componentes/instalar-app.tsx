'use client';

import { Botao } from '@pente-fino/ui';
import { Share, Smartphone, SquarePlus, X } from 'lucide-react';
import { useState } from 'react';
import { useInstalarApp } from '@/lib/instalar';

const DISPENSADO = 'pf-instalar-dispensado';
const lerDispensado = () => {
  try {
    return localStorage.getItem(DISPENSADO) === '1';
  } catch {
    return false;
  }
};

/** Passo a passo do Safari no iPhone (lá não existe o botão de instalar). */
function PassosIphone() {
  return (
    <ol className="flex flex-col gap-2 text-sm text-tinta-suave">
      <li className="flex items-center gap-2">
        <span className="font-semibold text-tinta">1.</span> No Safari, toque em
        <Share aria-label="Compartilhar" className="size-4 text-tinta" />
        <span className="font-semibold text-tinta">Compartilhar</span>
      </li>
      <li className="flex items-center gap-2">
        <span className="font-semibold text-tinta">2.</span> Escolha
        <SquarePlus aria-hidden className="size-4 text-tinta" />
        <span className="font-semibold text-tinta">Adicionar à Tela de Início</span>
      </li>
      <li className="flex items-center gap-2">
        <span className="font-semibold text-tinta">3.</span> Toque em
        <span className="font-semibold text-tinta">Adicionar</span>
      </li>
    </ol>
  );
}

function Resultado({ r }: { r: ReturnType<typeof useInstalarApp>['resultado'] }) {
  if (!r) return null;
  const texto = {
    instalado: 'Pronto: o Pente Fino está na tela do celular.',
    cancelado: 'Instalação cancelada. Dá para tentar de novo quando quiser.',
    erro: 'Não deu para instalar agora. Use o menu do navegador: "Instalar app" ou "Adicionar à tela inicial".',
  }[r];
  return (
    <p role="status" className="text-sm text-tinta-suave">
      {texto}
    </p>
  );
}

/** Perfil → App na tela do celular. */
export function InstalarApp() {
  const { modo, instalar, resultado, ocupado } = useInstalarApp();
  if (!modo) return null;
  return (
    <section className="flex flex-col gap-3" aria-labelledby="titulo-instalar">
      <h2
        id="titulo-instalar"
        className="text-xs font-semibold uppercase tracking-wider text-tinta-suave"
      >
        App na tela do celular
      </h2>
      <div className="flex flex-col gap-3 rounded-lg border border-borda bg-superficie p-4">
        {modo === 'instalado' ? (
          <p className="text-tinta-suave">O Pente Fino já está instalado neste aparelho.</p>
        ) : (
          <>
            <p className="text-tinta-suave">
              Abre direto, em tela cheia, como os outros apps. Sem loja de aplicativos.
            </p>
            {modo === 'botao' ? (
              <Botao className="self-start" carregando={ocupado} onClick={() => void instalar()}>
                <Smartphone aria-hidden className="size-5" /> Instalar o app
              </Botao>
            ) : (
              <PassosIphone />
            )}
          </>
        )}
        <Resultado r={resultado} />
      </div>
    </section>
  );
}

/**
 * Convite no topo do app, só no celular e até a pessoa instalar ou fechar. Quem fechou acha de
 * novo no Perfil.
 */
export function ConviteInstalar() {
  const { modo, instalar, resultado, ocupado } = useInstalarApp();
  const [dispensado, setDispensado] = useState(lerDispensado);
  if (dispensado || (modo !== 'botao' && modo !== 'iphone') || resultado === 'instalado')
    return null;
  const fechar = () => {
    setDispensado(true);
    try {
      localStorage.setItem(DISPENSADO, '1');
    } catch {
      // Sem armazenamento: o convite volta no próximo acesso.
    }
  };
  return (
    <section
      aria-labelledby="titulo-convite-instalar"
      className="relative mx-4 mt-4 flex flex-col gap-3 rounded-lg border border-borda-forte bg-superficie p-4 pr-14 md:hidden"
    >
      <div className="flex items-start gap-3">
        <Smartphone aria-hidden className="mt-0.5 size-5 shrink-0 text-acao-texto" />
        <div className="flex flex-col gap-1">
          <h2 id="titulo-convite-instalar" className="font-semibold">
            Instale o Pente Fino no celular
          </h2>
          <p className="text-sm text-tinta-suave">
            Fica na tela como os outros apps e abre em tela cheia.
          </p>
        </div>
      </div>
      {modo === 'botao' ? (
        <Botao className="self-start" carregando={ocupado} onClick={() => void instalar()}>
          Instalar o app
        </Botao>
      ) : (
        <PassosIphone />
      )}
      <Resultado r={resultado} />
      <button
        type="button"
        onClick={fechar}
        aria-label="Fechar o convite para instalar"
        className="absolute top-2 right-2 grid size-11 place-items-center rounded-md text-tinta-suave hover:bg-superficie-2 hover:text-tinta focus-visible:outline-2 focus-visible:outline-foco"
      >
        <X aria-hidden className="size-5" />
      </button>
    </section>
  );
}
