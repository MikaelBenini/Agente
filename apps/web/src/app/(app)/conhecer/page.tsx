import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TelaConhecer } from '@/componentes/telas/conhecer-basico';

export const metadata: Metadata = { title: 'Conheça o Básico' };

export default function Pagina() {
  return (
    <Suspense>
      <TelaConhecer />
    </Suspense>
  );
}
