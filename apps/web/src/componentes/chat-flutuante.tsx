'use client';

import { MessageCircle, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChatAjuda } from './telas/chat-ajuda';

const ID = 'chat-suporte';

/**
 * Admin F6: o chat com o suporte em todo o painel (pedido do dono em 11/11), não só na Ajuda. O
 * botão fica ao lado do sino de avisos (no topo, no celular e no menu lateral): o botão flutuante
 * no canto de baixo cobria o "Enviar" e outros botões (verificação do CI em 15/11).
 */
export function BotaoSuporte({ className }: { className: string }) {
  // Na Ajuda o chat já está na página.
  if (usePathname().startsWith('/ajuda')) return null;
  return (
    <button type="button" popoverTarget={ID} aria-label="Falar com o suporte" className={className}>
      <MessageCircle aria-hidden className="size-5" />
    </button>
  );
}

/**
 * O painel do chat: popover nativo, que fecha tocando fora ou com Esc, sem código de foco (guia
 * declarative-dialog-popover-control). A conversa só é montada (e consultada) com ele aberto.
 */
export function PainelSuporte() {
  const [aberto, setAberto] = useState(false);
  return (
    <div
      id={ID}
      popover="auto"
      role="dialog"
      aria-labelledby="titulo-chat-suporte"
      onToggle={(e) => setAberto((e as unknown as ToggleEvent).newState === 'open')}
      className="fixed inset-auto top-[calc(4rem+env(safe-area-inset-top))] right-2 m-0 max-h-[min(36rem,calc(100dvh-6rem))] w-[min(24rem,calc(100vw-1rem))] overflow-y-auto rounded-lg border border-borda bg-superficie p-4 text-tinta shadow-2xl lg:top-20 lg:right-auto lg:left-[16.5rem]"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 id="titulo-chat-suporte" className="text-lg font-semibold">
          Falar com o suporte
        </h2>
        <button
          type="button"
          popoverTarget={ID}
          popoverTargetAction="hide"
          aria-label="Fechar o chat"
          className="grid size-11 shrink-0 place-items-center rounded-md text-tinta-suave hover:bg-superficie-2 hover:text-tinta focus-visible:outline-2 focus-visible:outline-foco"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>
      {aberto && <ChatAjuda />}
    </div>
  );
}
