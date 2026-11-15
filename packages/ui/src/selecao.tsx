import { ChevronDown } from 'lucide-react';
import type { Ref, SelectHTMLAttributes } from 'react';
import { cn } from './cn.js';

export interface SelecaoProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  rotulo: string;
  erro?: string;
  dica?: string;
  opcoes: { valor: string; rotulo: string }[];
  ref?: Ref<HTMLSelectElement>;
}

export function Selecao({ id, rotulo, erro, dica, opcoes, className, ...props }: SelecaoProps) {
  return (
    // O erro que aparece (ao sair do campo ou no envio) é lido com calma, sem repetir o texto
    // (guia accessible-error-announcement); o rótulo e o valor não mudam, então só ele é lido.
    // A largura (className) vale para o campo inteiro: com ela só no <select>, a seta ficava
    // longe, no canto da linha (Minha página, revisão do dono em 15/11).
    <div
      className={cn('flex flex-col gap-1.5', className)}
      aria-live="polite"
      aria-relevant="additions"
    >
      <label htmlFor={id} className="text-sm font-medium text-tinta">
        {rotulo}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={erro ? true : false}
          aria-describedby={erro ? `${id}-erro` : dica ? `${id}-dica` : undefined}
          className={cn(
            'min-h-11 w-full appearance-none rounded-md border bg-superficie pr-10 pl-3 text-base text-tinta',
            'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foco',
            erro ? 'border-perigo-texto' : 'border-borda',
          )}
          {...props}
        >
          {opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-tinta-suave"
        />
      </div>
      {erro && (
        <p id={`${id}-erro`} className="text-sm text-perigo-texto">
          {erro}
        </p>
      )}
      {dica && !erro && (
        <p id={`${id}-dica`} className="text-sm text-tinta-suave">
          {dica}
        </p>
      )}
    </div>
  );
}
