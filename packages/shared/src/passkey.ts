// Passkey (pedido do dono em 15/11): entrar com a digital, o rosto ou o PIN do celular, sem senha.
// A conferência criptográfica fica na API (@simplewebauthn/server); aqui ficam o que a tela e a
// API trocam e o nome do gerenciador de senhas pelo AAGUID (só para mostrar, nunca para decidir
// acesso: guia security/passkeys da skill modern-web-guidance).
import { z } from 'zod';

/** Quanto tempo o desafio do navegador vale (segundos). */
export const VALIDADE_DESAFIO_PASSKEY = 300;
/** Quantas passkeys cada pessoa pode ter (um celular, um computador, um reserva...). */
export const MAXIMO_PASSKEYS = 10;

/** Resposta do navegador (`credential.toJSON()`); a biblioteca da API confere o formato. */
const respostaDoNavegador = z.looseObject({
  id: z.string().min(1).max(1024),
  rawId: z.string().min(1).max(1024),
  type: z.literal('public-key'),
  response: z.looseObject({}),
});

export const entrarComPasskeySchema = z.object({
  desafioId: z.uuid(),
  resposta: respostaDoNavegador,
});
export type EntrarComPasskeyEntrada = z.infer<typeof entrarComPasskeySchema>;

export const criarPasskeySchema = z.object({ resposta: respostaDoNavegador });
export type CriarPasskeyEntrada = z.infer<typeof criarPasskeySchema>;

export const renomearPasskeySchema = z.object({
  nome: z.string().trim().min(1, { error: 'Dê um nome.' }).max(60),
});

/** Opções para o navegador (JSON do WebAuthn) e o id do desafio guardado na API. */
export interface OpcoesPasskey {
  desafioId: string;
  opcoes: Record<string, unknown>;
}

export interface PasskeyNaTela {
  id: string;
  nome: string;
  /** Guardada na nuvem do gerenciador (aparece nos outros aparelhos da pessoa). */
  sincronizada: boolean;
  criadaEm: string;
  usadaEm: string | null;
}

/** Os gerenciadores mais comuns (AAGUID → nome). Fora da lista: "Passkey". */
const GERENCIADORES: Record<string, string> = {
  'ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4': 'Gerenciador de senhas do Google',
  'fbfc3007-154e-4ecc-8c0b-6e020557d7bd': 'Chaves do iCloud',
  '08987058-cadc-4b81-b6e1-30de50dcbe96': 'Windows Hello',
  'bada5566-a7aa-401f-bd96-45619a55120d': '1Password',
  'd548826e-79b4-db40-a3d8-11116f7e8349': 'Bitwarden',
  '53414d53-554e-4700-0000-000000000000': 'Samsung Pass',
};

export function nomeDaPasskey(aaguid: string): string {
  return GERENCIADORES[aaguid.toLowerCase()] ?? 'Passkey';
}
