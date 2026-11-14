'use client';

// Campos com máscara e validação na hora (revisão dos campos, pedido do dono em 13/11): o mesmo
// jeito de digitar e a mesma mensagem em todos os formulários. A conferência final continua no
// servidor, pelo mesmo zod do shared.
import {
  documentoValido,
  erroDoCep,
  erroDoTelefone,
  mascararCep,
  mascararDocumento,
  mascararTelefone,
} from '@pente-fino/shared';
import { Campo } from '@pente-fino/ui';
import type { ComponentProps } from 'react';

type Base = Omit<ComponentProps<typeof Campo>, 'value' | 'onChange' | 'type'> & {
  valor: string;
  onValor: (v: string) => void;
};

/** WhatsApp ou telefone com DDD: "(11) 98888-7777". */
export function CampoTelefone({
  valor,
  onValor,
  erro,
  obrigatorio = false,
  ...props
}: Base & { obrigatorio?: boolean }) {
  return (
    <Campo
      inputMode="tel"
      autoComplete="tel-national"
      placeholder="(11) 98888-7777"
      {...props}
      value={valor}
      onChange={(e) => onValor(mascararTelefone(e.target.value))}
      erro={erro ?? erroDoTelefone(valor, obrigatorio && valor.length > 0) ?? undefined}
    />
  );
}

/** CPF ou CNPJ com a máscara e o dígito verificador conferido quando o número fica completo. */
export function CampoDocumento({
  valor,
  onValor,
  erro,
  soCpf = false,
  ...props
}: Base & { soCpf?: boolean }) {
  const d = valor.replace(/\D/g, '');
  const completo = soCpf ? d.length === 11 : d.length === 11 || d.length === 14;
  const invalido = completo && !documentoValido(d);
  return (
    <Campo
      inputMode="numeric"
      autoComplete="off"
      placeholder={soCpf ? '000.000.000-00' : 'CPF ou CNPJ'}
      {...props}
      value={valor}
      onChange={(e) => {
        const texto = soCpf ? e.target.value.replace(/\D/g, '').slice(0, 11) : e.target.value;
        onValor(mascararDocumento(texto));
      }}
      erro={erro ?? (invalido ? (soCpf ? 'CPF inválido.' : 'CPF ou CNPJ inválido.') : undefined)}
    />
  );
}

/** CEP: "01310-100". */
export function CampoCep({ valor, onValor, erro, ...props }: Base) {
  return (
    <Campo
      inputMode="numeric"
      autoComplete="postal-code"
      placeholder="00000-000"
      {...props}
      value={valor}
      onChange={(e) => onValor(mascararCep(e.target.value))}
      erro={erro ?? erroDoCep(valor) ?? undefined}
    />
  );
}
