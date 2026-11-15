import { expect, test, type Page } from '@playwright/test';

// Passkey de ponta a ponta (pedido do dono em 15/11), com o autenticador virtual do Chrome no
// lugar da digital: cria no Perfil, sai, entra pelo botão "Usar passkey" e apaga.
async function digitalDeMentira(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

test('passkey: cria no Perfil, entra sem senha e apaga', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'computador', 'um aparelho basta');
  await digitalDeMentira(page);
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('recepcao.centro@demo.pentefino.dev');
  await page.getByLabel('Senha').fill('pentefino123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.waitForURL(/inicio|agenda|hoje|comandas/);

  await page.goto('/perfil');
  const secao = page.getByRole('region', { name: 'Entrar sem senha' });
  await secao.getByRole('button', { name: 'Criar passkey neste aparelho' }).click();
  await expect(secao.getByRole('status')).toContainText('Pronto: da próxima vez');
  await expect(secao.getByRole('listitem')).toHaveCount(1);

  // Sai (sem cookies) e entra só com a passkey, sem digitar e-mail nem senha.
  await context.clearCookies();
  await page.goto('/entrar');
  // O autenticador de teste aceita sozinho a sugestão do campo de e-mail; sem ela, o botão.
  const noApp = /inicio|agenda|hoje|comandas/;
  await Promise.race([
    page.waitForURL(noApp),
    page
      .getByRole('button', { name: /Usar passkey/ })
      .click()
      .catch(() => undefined),
  ]);
  await page.waitForURL(noApp);

  await page.goto('/perfil');
  await expect(secao.getByText(/usada em/)).toBeVisible();
  await secao.getByRole('button', { name: 'Apagar' }).click();
  await page
    .getByRole('dialog', { name: 'Apagar esta passkey?' })
    .getByRole('button', { name: 'Apagar' })
    .click();
  await expect(secao.getByRole('listitem')).toHaveCount(0);
});
