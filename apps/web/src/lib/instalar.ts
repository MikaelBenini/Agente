'use client';

// Instalar o app na tela do celular (guia `pwa/install-web-app` da skill modern-web-guidance).
// O navegador avisa que dá para instalar (`beforeinstallprompt`, Chrome e Edge) logo no começo,
// antes do React: o SCRIPT_INSTALAR, no <head>, guarda o aviso. `navigator.install()` é o jeito
// novo e vem primeiro quando existir. No iPhone não há aviso: a tela mostra o passo a passo do
// Safari. Sem nenhum dos dois, o botão não aparece (o navegador ainda tem o próprio menu).
import { useEffect, useState, useSyncExternalStore } from 'react';
import { EVENTO_INSTALAR as EVENTO } from './instalar-script';

type PedidoInstalar = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

declare global {
  interface Window {
    __pfInstalar?: PedidoInstalar | null;
  }
  interface Navigator {
    install?: () => Promise<unknown>;
    standalone?: boolean;
  }
}

const assinar = (avisar: () => void) => {
  addEventListener(EVENTO, avisar);
  const m = matchMedia('(display-mode: standalone)');
  m.addEventListener('change', avisar);
  return () => {
    removeEventListener(EVENTO, avisar);
    m.removeEventListener('change', avisar);
  };
};

export type ModoInstalar = 'instalado' | 'botao' | 'iphone' | null;

function modoAtual(): ModoInstalar {
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) return 'instalado';
  if (typeof navigator.install === 'function' || window.__pfInstalar) return 'botao';
  // iPhone e iPad (o iPad novo se diz Mac, mas tem toque).
  const ios =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
  return ios ? 'iphone' : null;
}

/** Como dá para instalar neste aparelho, e a ação do botão. */
export function useInstalarApp() {
  const modo = useSyncExternalStore(assinar, modoAtual, () => null);
  const [resultado, setResultado] = useState<'instalado' | 'cancelado' | 'erro' | null>(null);
  const [ocupado, setOcupado] = useState(false);

  // Depois de instalar pelo aviso, o navegador não manda outro: a tela sai do modo "botao".
  useEffect(() => {
    if (resultado === 'instalado') dispatchEvent(new Event(EVENTO));
  }, [resultado]);

  async function instalar() {
    if (ocupado) return;
    setOcupado(true);
    try {
      if (typeof navigator.install === 'function') {
        // Chamado direto do clique: o navegador exige o gesto da pessoa.
        await navigator.install();
        setResultado('instalado');
      } else if (window.__pfInstalar) {
        // O aviso vale uma vez só: tira antes de esperar a resposta.
        const pedido = window.__pfInstalar;
        window.__pfInstalar = null;
        await pedido.prompt();
        const { outcome } = await pedido.userChoice;
        setResultado(outcome === 'accepted' ? 'instalado' : 'cancelado');
      }
    } catch (e) {
      setResultado(e instanceof DOMException && e.name === 'AbortError' ? 'cancelado' : 'erro');
    } finally {
      setOcupado(false);
    }
  }

  return { modo, instalar, resultado, ocupado };
}
