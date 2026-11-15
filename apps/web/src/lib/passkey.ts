'use client';

// Passkey no navegador (guias security/passkey-registration e passkey-authentication da skill
// modern-web-guidance): só as funções nativas do WebAuthn, sem biblioteca. Onde o navegador não
// tem `parse...FromJSON` (Safari antes do 18.4), a passkey não aparece e a senha segue valendo.
import type { OpcoesPasskey, PasskeyNaTela } from '@pente-fino/shared';
import { api, ErroApi } from './api';

type ComJson = typeof PublicKeyCredential & {
  parseCreationOptionsFromJSON?: (o: unknown) => PublicKeyCredentialCreationOptions;
  parseRequestOptionsFromJSON?: (o: unknown) => PublicKeyCredentialRequestOptions;
  getClientCapabilities?: () => Promise<Record<string, boolean>>;
  signalUnknownCredential?: (o: { rpId: string; credentialId: string }) => Promise<void>;
};

const PKC = () =>
  typeof window !== 'undefined' && 'PublicKeyCredential' in window
    ? (window.PublicKeyCredential as ComJson)
    : null;

/** O navegador sabe criar e usar passkey do jeito que a tela usa. */
export function temPasskey(): boolean {
  const p = PKC();
  return (
    !!p &&
    typeof p.parseCreationOptionsFromJSON === 'function' &&
    typeof p.parseRequestOptionsFromJSON === 'function'
  );
}

/** A sugestão da passkey no campo de e-mail (autofill), quando o navegador oferece. */
export async function temSugestaoNoCampo(): Promise<boolean> {
  const p = PKC();
  if (!temPasskey() || !p?.getClientCapabilities) return false;
  try {
    return !!(await p.getClientCapabilities()).conditionalGet;
  } catch {
    return false;
  }
}

/** Erros do navegador que não são falha: a pessoa cancelou ou outra tentativa assumiu. */
export const foiCancelado = (e: unknown) =>
  e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'AbortError');

/** Avisa o gerenciador de senhas que a passkey não existe mais aqui (quando sabe). */
async function avisarDesconhecida(rpId: string | undefined, credentialId: string) {
  const p = PKC();
  if (!rpId || !p?.signalUnknownCredential) return;
  try {
    await p.signalUnknownCredential({ rpId, credentialId });
  } catch {
    // Só uma gentileza com o gerenciador; não muda nada para a pessoa.
  }
}

/**
 * Entra com a passkey. `campo`: a sugestão no campo de e-mail (sem janela); sem ele, a janela do
 * gerenciador abre na hora (botão). Devolve false se a pessoa cancelou.
 */
export async function entrarComPasskey(sinal: AbortSignal, campo = false): Promise<boolean> {
  const p = PKC()!;
  const { desafioId, opcoes } = await api<OpcoesPasskey>('auth/passkey/opcoes', { corpo: {} });
  const publicKey = p.parseRequestOptionsFromJSON!(opcoes);
  let credencial: PublicKeyCredential;
  try {
    credencial = (await navigator.credentials.get({
      publicKey,
      signal: sinal,
      ...(campo ? { mediation: 'conditional' as CredentialMediationRequirement } : {}),
    })) as PublicKeyCredential;
  } catch (e) {
    if (foiCancelado(e)) return false;
    throw e;
  }
  const resposta = credencial.toJSON();
  try {
    await api('auth/passkey/entrar', { corpo: { desafioId, resposta } });
    return true;
  } catch (e) {
    if (e instanceof ErroApi && e.status === 404)
      await avisarDesconhecida(opcoes.rpId as string | undefined, credencial.id);
    throw e;
  }
}

/** Cria uma passkey para quem está logado. Devolve null se a pessoa cancelou. */
export async function criarPasskey(): Promise<PasskeyNaTela | null> {
  const p = PKC()!;
  const { desafioId, opcoes } = await api<OpcoesPasskey>('me/passkeys/opcoes', { corpo: {} });
  const publicKey = p.parseCreationOptionsFromJSON!(opcoes);
  let credencial: PublicKeyCredential;
  try {
    credencial = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential;
  } catch (e) {
    if (foiCancelado(e)) return null;
    if (e instanceof DOMException && e.name === 'InvalidStateError')
      throw new Error('Este aparelho já tem uma passkey sua.');
    throw e;
  }
  const resposta = credencial.toJSON();
  try {
    return await api<PasskeyNaTela>(`me/passkeys/${desafioId}`, { corpo: { resposta } });
  } catch (e) {
    // A passkey ficou no aparelho, mas não aqui: avisa o gerenciador para não sobrar uma órfã.
    const rp = (opcoes.rp as { id?: string } | undefined)?.id;
    await avisarDesconhecida(rp, credencial.id);
    throw e;
  }
}
