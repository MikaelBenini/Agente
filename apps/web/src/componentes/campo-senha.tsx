'use client';

import { Campo } from '@pente-fino/ui';
import { useState, type ComponentProps } from 'react';

/**
 * Campo de senha com "Mostrar senha" (login e cadastro; revisão de 16/11/2026). O botão fica
 * fora do campo, com aria-pressed, para o leitor de tela saber se a senha está visível.
 */
export function CampoSenha(props: Omit<ComponentProps<typeof Campo>, 'type'>) {
  const [ver, setVer] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <Campo {...props} type={ver ? 'text' : 'password'} />
      <button
        type="button"
        aria-controls={props.id}
        aria-pressed={ver}
        onClick={() => setVer(!ver)}
        className="inline-flex min-h-11 items-center self-start text-sm font-medium text-tinta-suave underline-offset-4 hover:text-tinta hover:underline focus-visible:outline-2 focus-visible:outline-foco"
      >
        {ver ? 'Esconder senha' : 'Mostrar senha'}
      </button>
    </div>
  );
}
