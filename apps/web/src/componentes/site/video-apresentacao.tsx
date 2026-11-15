'use client';

import { Volume2 } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

const CONSULTA = '(prefers-reduced-motion: reduce)';
const assinar = (avisar: () => void) => {
  const m = window.matchMedia(CONSULTA);
  m.addEventListener('change', avisar);
  return () => m.removeEventListener('change', avisar);
};

/**
 * Vídeo de 1 minuto do sistema (apps/video, com fotos reais da conta de demonstração). Toca sozinho
 * quando aparece na tela, sem som e em loop: o navegador só deixa o autoplay mudo. O botão "Ativar
 * som" volta ao começo com a trilha. Quem pediu menos movimento no aparelho vê a capa e dá o play.
 */
export function VideoApresentacao() {
  const reduzir = useSyncExternalStore(
    assinar,
    () => window.matchMedia(CONSULTA).matches,
    () => true,
  );
  const video = useRef<HTMLVideoElement>(null);
  const [mudo, setMudo] = useState(true);

  // Toca quando aparece e pausa quando sai da tela.
  useEffect(() => {
    const v = video.current;
    if (!v || reduzir || typeof IntersectionObserver === 'undefined') return;
    const observador = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) void v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.4 },
    );
    observador.observe(v);
    return () => observador.disconnect();
  }, [reduzir]);

  function ativarSom() {
    const v = video.current;
    if (!v) return;
    v.muted = false;
    v.currentTime = 0;
    void v.play().catch(() => {});
    setMudo(false);
  }

  return (
    <div className="relative">
      <video
        // Troca de elemento ao mudar a preferência, para o autoplay valer.
        key={reduzir ? 'parado' : 'tocando'}
        ref={video}
        id="apresentacao"
        className="aspect-video w-full rounded-xl border border-borda bg-fundo shadow-2xl"
        poster="/video/apresentacao.jpg"
        width={1280}
        height={720}
        muted
        loop
        playsInline
        controls
        preload={reduzir ? 'none' : 'metadata'}
        // Abaixo da dobra: só baixa capa e vídeo perto de aparecer (guia lazy-load-video-and-audio;
        // Chrome e Edge; os outros ignoram e seguem o preload). Ainda fora dos tipos do React.
        {...({ loading: 'lazy' } as Record<string, string>)}
        autoPlay={!reduzir}
        onVolumeChange={(e) => setMudo(e.currentTarget.muted)}
        aria-label="Vídeo de 1 minuto: lucro do mês, margem de cada serviço, agendamento pelo link, comanda, comissão, caixa, lembretes, WhatsApp, site e clube"
      >
        <source src="/video/apresentacao.webm" type={`video/webm; codecs="vp9"`} />
        <source src="/video/apresentacao.mp4" type="video/mp4" />
      </video>
      {mudo && !reduzir && (
        <button
          type="button"
          onClick={ativarSom}
          className="absolute top-3 right-3 inline-flex items-center gap-2 rounded-full bg-modulo px-4 py-2 text-sm font-semibold text-sobre-modulo shadow-lg transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-modulo sm:top-4 sm:right-4 sm:text-base"
        >
          <Volume2 className="size-5" aria-hidden />
          Ativar som
        </button>
      )}
    </div>
  );
}
