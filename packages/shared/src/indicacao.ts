// Indique e ganhe (regras decididas pelo dono em 14/11):
// - qualquer pessoa indica (não só barbeiro), com cadastro grátis e link próprio;
// - quem indica ganha 20% de cada mensalidade paga pela indicada, nos 12 primeiros meses dela;
// - quem já é cliente pode trocar o Pix por 1 mês grátis por indicada que pagar;
// - a indicada entra pelo link com 30 dias de teste;
// - a comissão libera 30 dias depois do pagamento (prazo de estorno); Pix uma vez por mês, a
//   partir de R$ 50 acumulados, com CPF e chave Pix; a administração paga e marca como pago.
// O banco cria a comissão sozinho quando a fatura da indicada fica paga (gatilho na migração
// "indique_e_ganhe"); estas funções são a mesma regra para a tela e os testes.
import { z } from 'zod';
import { documentoValido } from './assinatura.js';

export const COMISSAO_INDICACAO_BP = 2000;
export const MESES_COM_COMISSAO = 12;
export const DIAS_PARA_LIBERAR = 30;
export const MINIMO_SAQUE = 5000;
export const DIAS_TESTE_INDICADA = 30;

/** Código do link: 6 a 12 letras e números, em maiúsculas. */
export const codigoIndicacaoSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6,12}$/, { error: 'Código de indicação inválido.' });

/** Gera um código fácil de ditar: sem 0/O, 1/I/L. */
export function gerarCodigoIndicacao(aleatorio: () => number = Math.random): string {
  const letras = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 7 }, () => letras[Math.floor(aleatorio() * letras.length)]).join('');
}

const chavePix = z
  .string()
  .trim()
  .min(3, { error: 'Informe a chave Pix.' })
  .max(140, { error: 'Chave Pix grande demais.' });

const cpf = z
  .string()
  .transform((t) => t.replace(/\D/g, ''))
  .refine((d) => d.length === 11 && documentoValido(d), { error: 'CPF inválido.' });

/** Cadastro de quem indica sem ser cliente: recebe sempre em Pix. */
export const cadastroIndicadorSchema = z.object({
  nome: z.string().trim().min(2, { error: 'Informe seu nome.' }).max(120),
  email: z.email({ error: 'E-mail inválido.' }).trim().toLowerCase(),
  cpf,
  chavePix,
});
export type CadastroIndicadorEntrada = z.infer<typeof cadastroIndicadorSchema>;

/** Dono que já é cliente: escolhe Pix (com CPF e chave) ou meses grátis. */
export const indicacaoDaContaSchema = z.discriminatedUnion('recebe', [
  z.object({ recebe: z.literal('meses') }),
  z.object({ recebe: z.literal('pix'), cpf, chavePix }),
]);
export type IndicacaoDaContaEntrada = z.infer<typeof indicacaoDaContaSchema>;

export type TipoComissao = 'pix' | 'mes';

/** Uma comissão como o banco devolve. */
export interface ComissaoIndicacao {
  id: string;
  tipo: TipoComissao;
  /** Centavos (0 nos meses grátis). */
  valor: number;
  liberaEm: string;
  pagaEm: string | null;
  canceladaEm: string | null;
  /** Meses grátis: quando a administração aplicou na assinatura. */
  aplicadaEm: string | null;
}

/** Comissão em Pix de uma mensalidade: 20% do que a indicada pagou. */
export const comissaoDaMensalidade = (valor: number) =>
  Math.round((valor * COMISSAO_INDICACAO_BP) / 10000);

/** A mensalidade ainda dá comissão? Só nos 12 primeiros meses desde o primeiro pagamento. */
export function dentroDoPrazoDeComissao(primeiroPagamento: Date, pagamento: Date): boolean {
  const limite = new Date(primeiroPagamento);
  limite.setUTCMonth(limite.getUTCMonth() + MESES_COM_COMISSAO);
  return pagamento.getTime() < limite.getTime();
}

export interface ResumoIndicador {
  /** Pix que ainda está no prazo de estorno. */
  aLiberar: number;
  /** Pix liberado e ainda não pago. */
  liberado: number;
  pago: number;
  /** O liberado já passou do mínimo para o Pix do mês. */
  podeReceber: boolean;
  mesesGanhos: number;
  mesesAplicados: number;
}

export function resumoDoIndicador(
  comissoes: readonly ComissaoIndicacao[],
  agora: Date,
): ResumoIndicador {
  const r: ResumoIndicador = {
    aLiberar: 0,
    liberado: 0,
    pago: 0,
    podeReceber: false,
    mesesGanhos: 0,
    mesesAplicados: 0,
  };
  for (const c of comissoes) {
    if (c.canceladaEm) continue;
    if (c.tipo === 'mes') {
      r.mesesGanhos++;
      if (c.aplicadaEm) r.mesesAplicados++;
      continue;
    }
    if (c.pagaEm) r.pago += c.valor;
    else if (Date.parse(c.liberaEm) <= agora.getTime()) r.liberado += c.valor;
    else r.aLiberar += c.valor;
  }
  r.podeReceber = r.liberado >= MINIMO_SAQUE;
  return r;
}

/** O que o indicador vê no painel (público, pelo link secreto, ou na conta do dono). */
export interface PainelIndicador {
  nome: string;
  codigo: string;
  recebe: 'pix' | 'meses';
  /** Barbearias que entraram pelo link: em teste e pagantes. */
  indicadas: { emTeste: number; pagantes: number };
  resumo: ResumoIndicador;
  comissoes: ComissaoIndicacao[];
}

/** Linha da administração: quem tem Pix para receber ou meses para aplicar. */
export interface IndicadorNaAdmin {
  id: string;
  nome: string;
  email: string;
  cpf: string | null;
  chavePix: string | null;
  codigo: string;
  recebe: 'pix' | 'meses';
  cliente: boolean;
  indicadas: number;
  resumo: ResumoIndicador;
  /** Meses grátis liberados e ainda não aplicados na assinatura (ids das comissões). */
  mesesPendentes: string[];
}
