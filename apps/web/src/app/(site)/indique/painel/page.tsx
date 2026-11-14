'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PainelDoIndicador } from '@/componentes/site/indique';

function Painel() {
  const token = useSearchParams().get('t') ?? '';
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16 sm:px-6">
      <h1 className="font-denso text-4xl font-bold uppercase sm:text-5xl">Suas indicações</h1>
      <PainelDoIndicador token={token} />
    </section>
  );
}

export default function Pagina() {
  return (
    <Suspense>
      <Painel />
    </Suspense>
  );
}
