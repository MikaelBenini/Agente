'use client';

import { useEffect } from 'react';

/**
 * Barra do navegador no celular na cor do cabeçalho do site da barbearia (guia
 * browser-ui-theming). Troca a meta theme-color depois de abrir, sem segurar a página no
 * servidor, e devolve a cor do Pente Fino ao sair.
 */
export function CorDoNavegador({ cor }: { cor: string }) {
  useEffect(() => {
    const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
    const antes = metas.map((m) => m.content);
    metas.forEach((m) => (m.content = cor));
    return () => metas.forEach((m, i) => (m.content = antes[i] ?? m.content));
  }, [cor]);
  return null;
}
