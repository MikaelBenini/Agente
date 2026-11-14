'use client';

// Depoimentos da página de vendas num carrossel (pedido do dono em 14/11). Vêm de /admin; sem
// nenhum ativo, a seção não aparece. Passa sozinho a cada 7 s, para quando o mouse ou o foco
// está nele, e não anda sozinho para quem pediu menos movimento.
import type { DepoimentoNaTela } from '@pente-fino/shared';
import { cn } from '@pente-fino/ui';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const dataBr = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

export function CarrosselDepoimentos() {
  const q = useQuery({
    queryKey: ['publico', 'depoimentos'],
    queryFn: () => api<DepoimentoNaTela[]>('publico/depoimentos'),
    staleTime: 10 * 60_000,
    retry: false,
  });
  const lista = q.data ?? [];
  const [atual, setAtual] = useState(0);
  const [parado, setParado] = useState(false);
  const total = lista.length;

  useEffect(() => {
    if (total < 2 || parado) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setAtual((i) => (i + 1) % total), 7000);
    return () => clearInterval(t);
  }, [total, parado]);

  if (total === 0) return null;
  const i = Math.min(atual, total - 1);
  const d = lista[i]!;
  const ir = (n: number) => setAtual((n + total) % total);

  return (
    <section
      aria-labelledby="depoimentos"
      aria-roledescription="carrossel"
      className="mx-auto max-w-4xl px-4 py-16 sm:px-6 md:py-24"
      onMouseEnter={() => setParado(true)}
      onMouseLeave={() => setParado(false)}
      onFocus={() => setParado(true)}
      onBlur={() => setParado(false)}
    >
      <h2 id="depoimentos" className="mb-8 font-denso text-4xl font-bold uppercase sm:text-5xl">
        Quem usa, conta
      </h2>
      <figure
        key={d.id}
        aria-roledescription="depoimento"
        aria-label={`${i + 1} de ${total}`}
        className="animar-entrada flex flex-col gap-6 rounded-2xl border border-borda bg-superficie p-6 sm:p-10"
      >
        <Quote aria-hidden className="size-8 text-modulo-texto" />
        <blockquote className="text-xl leading-relaxed sm:text-2xl">“{d.texto}”</blockquote>
        <figcaption className="flex items-center gap-4">
          {d.foto ? (
            // eslint-disable-next-line @next/next/no-img-element -- foto da API, já reduzida (240 px)
            <img
              src={d.foto}
              alt=""
              width={56}
              height={56}
              loading="lazy"
              className="size-14 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="grid size-14 place-items-center rounded-full bg-superficie-3 font-denso text-2xl font-bold"
            >
              {d.nome.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="flex min-w-0 flex-col">
            <strong>{d.nome}</strong>
            <span className="text-sm text-tinta-suave">
              {[d.quem, dataBr(d.data)].filter(Boolean).join(', ')}
            </span>
            <a
              href={`https://www.instagram.com/${d.instagram}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-tinta underline underline-offset-4"
            >
              @{d.instagram}
            </a>
          </span>
        </figcaption>
      </figure>
      {total > 1 && (
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex gap-1.5" role="group" aria-label="Escolher o depoimento">
            {lista.map((x, n) => (
              <button
                key={x.id}
                type="button"
                onClick={() => ir(n)}
                aria-label={`Depoimento ${n + 1}: ${x.nome}`}
                aria-current={n === i ? 'true' : undefined}
                className="grid size-11 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-foco"
              >
                <span
                  aria-hidden
                  className={cn(
                    'h-2 rounded-full transition-all',
                    n === i ? 'w-6 bg-modulo' : 'w-2 bg-borda-forte',
                  )}
                />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => ir(i - 1)}
              aria-label="Depoimento anterior"
              className="grid size-11 place-items-center rounded-full border border-borda hover:bg-superficie-2 focus-visible:outline-2 focus-visible:outline-foco"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => ir(i + 1)}
              aria-label="Próximo depoimento"
              className="grid size-11 place-items-center rounded-full border border-borda hover:bg-superficie-2 focus-visible:outline-2 focus-visible:outline-foco"
            >
              <ChevronRight aria-hidden className="size-5" />
            </button>
          </div>
        </div>
      )}
      <p className="mt-4 text-sm text-tinta-suave">
        Depoimentos enviados pelos próprios donos, publicados com autorização.
      </p>
    </section>
  );
}
