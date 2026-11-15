'use client';

import { MessageCircle, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChatAjuda } from './telas/chat-ajuda';

/**
 * Admin F6: o chat com o suporte num botão flutuante em todo o painel (pedido do dono em 11/11),
 * não só na Ajuda. Popover nativo: fecha tocando fora ou com Esc, sem código de foco (guia
 * declarative-dialog-popover-control). A conversa só é montada (e consultada) com o painel aberto.
 */
export function ChatFlutuante() {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  // Na Ajuda o chat já está na página.
  if (caminho.startsWith('/ajuda')) return null;
  return (
    <>
      <button
        type="button"
        popoverTarget="chat-suporte"
        aria-label="Falar com o suporte"
        className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 grid size-14 place-items-center rounded-full bg-modulo text-sobre-modulo shadow-lg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco lg:right-6 lg:bottom-6"
      >
        <MessageCircle aria-hidden className="size-6" />
      </button>
      <div
        id="chat-suporte"
        popover="auto"
        role="dialog"
        aria-labelledby="titulo-chat-suporte"
        onToggle={(e) => setAberto((e as unknown as ToggleEvent).newState === 'open')}
        className="fixed inset-auto right-4 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] m-0 w-[min(24rem,calc(100vw-2rem))] max-h-[min(36rem,calc(100dvh-12rem))] overflow-y-auto rounded-lg border border-borda bg-superficie p-4 text-tinta shadow-2xl lg:right-6 lg:bottom-24"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id="titulo-chat-suporte" className="text-lg font-semibold">
            Falar com o suporte
          </h2>
          <button
            type="button"
            popoverTarget="chat-suporte"
            popoverTargetAction="hide"
            aria-label="Fechar o chat"
            className="grid size-11 shrink-0 place-items-center rounded-md text-tinta-suave hover:bg-superficie-2 hover:text-tinta focus-visible:outline-2 focus-visible:outline-foco"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        {aberto && <ChatAjuda />}
      </div>
    </>
  );
}
