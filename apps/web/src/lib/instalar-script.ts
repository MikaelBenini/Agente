// Vai no <head> do layout (servidor): guarda o aviso de instalar do navegador antes de a tela
// carregar. O resto da instalação fica em lib/instalar.ts (cliente).
export const EVENTO_INSTALAR = 'pf-instalar';

export const SCRIPT_INSTALAR = `addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__pfInstalar=e;dispatchEvent(new Event('${EVENTO_INSTALAR}'))});addEventListener('appinstalled',function(){window.__pfInstalar=null;dispatchEvent(new Event('${EVENTO_INSTALAR}'))});`;
