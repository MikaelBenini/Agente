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
import { useState, type ComponentProps } from 'react';

/**
 * Número pela metade só vira erro quando a pessoa sai do campo, nunca enquanto digita (guia
 * forms/validate-input-after-interaction).
 */
function useSaiu(onBlur?: ComponentProps<typeof Campo>['onBlur']) {
  const [saiu, setSaiu] = useState(false);
  return {
    saiu,
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      setSaiu(true);
      onBlur?.(e);
    },
  };
}

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
  onBlur,
  ...props
}: Base & { obrigatorio?: boolean }) {
  const saida = useSaiu(onBlur);
  const digitos = valor.replace(/\D/g, '').length;
  const pelaMetade = saida.saiu && digitos > 0 && digitos < 10;
  return (
    <Campo
      inputMode="tel"
      autoComplete="tel-national"
      placeholder="(11) 98888-7777"
      {...props}
      value={valor}
      onChange={(e) => onValor(mascararTelefone(e.target.value))}
      onBlur={saida.onBlur}
      erro={
        erro ??
        erroDoTelefone(valor, obrigatorio && valor.length > 0) ??
        (pelaMetade ? 'Número incompleto: confira o DDD e o número.' : undefined)
      }
    />
  );
}

/** CPF ou CNPJ com a máscara e o dígito verificador conferido quando o número fica completo. */
export function CampoDocumento({
  valor,
  onValor,
  erro,
  soCpf = false,
  onBlur,
  ...props
}: Base & { soCpf?: boolean }) {
  const saida = useSaiu(onBlur);
  const d = valor.replace(/\D/g, '');
  const completo = soCpf ? d.length === 11 : d.length === 11 || d.length === 14;
  const invalido = completo && !documentoValido(d);
  const pelaMetade = saida.saiu && d.length > 0 && !completo;
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
      onBlur={saida.onBlur}
      erro={
        erro ??
        (invalido
          ? soCpf
            ? 'CPF inválido.'
            : 'CPF ou CNPJ inválido.'
          : pelaMetade
            ? soCpf
              ? 'CPF incompleto: são 11 números.'
              : 'Incompleto: o CPF tem 11 números e o CNPJ, 14.'
            : undefined)
      }
    />
  );
}

/** CEP: "01310-100". */
export function CampoCep({ valor, onValor, erro, onBlur, ...props }: Base) {
  const saida = useSaiu(onBlur);
  const digitos = valor.replace(/\D/g, '').length;
  const pelaMetade = saida.saiu && digitos > 0 && digitos < 8;
  return (
    <Campo
      inputMode="numeric"
      autoComplete="postal-code"
      placeholder="00000-000"
      {...props}
      value={valor}
      onChange={(e) => onValor(mascararCep(e.target.value))}
      onBlur={saida.onBlur}
      erro={erro ?? erroDoCep(valor) ?? (pelaMetade ? 'CEP incompleto: são 8 números.' : undefined)}
    />
  );
}
