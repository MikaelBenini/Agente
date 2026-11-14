import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PainelPeloLink } from '@/componentes/site/indique';

// Painel pelo link secreto: fora do Google.
export const metadata: Metadata = { title: 'Suas indicações', robots: { index: false } };

export default function Pagina() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16 sm:px-6">
      <h1 className="font-denso text-4xl font-bold uppercase sm:text-5xl">Suas indicações</h1>
      <Suspense>
        <PainelPeloLink />
      </Suspense>
    </section>
  );
}
