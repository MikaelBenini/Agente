import { expect, test } from '@playwright/test';

// Indique e ganhe (regras do dono em 14/11): qualquer pessoa gera o link na página /indique, o
// painel abre pelo link secreto e quem chega pelo link vê os 30 dias de teste no cadastro.
test('indique e ganhe: gera o link, abre o painel e o cadastro mostra os 30 dias', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'celular', 'fluxo no computador');
  const sufixo = Date.now().toString(36);
  await page.goto('/indique');
  await expect(
    page.getByRole('heading', { level: 1, name: /Conhece um barbeiro\? Indique e ganhe/ }),
  ).toBeVisible();
  const form = page.getByRole('form', { name: 'Quero indicar' });
  await form.getByLabel('Seu nome').fill('Amigo de Barbeiro');
  await form.getByLabel('E-mail').fill(`indica-${sufixo}@e2e.pentefino.dev`);
  await form.getByLabel('CPF (para o Pix)').pressSequentially('52998224725');
  await form.getByLabel('Chave Pix').fill(`indica-${sufixo}@e2e.pentefino.dev`);
  await form.getByRole('button', { name: 'Gerar meu link' }).click();
  await expect(page.getByRole('heading', { name: 'Pronto, seu link está aqui' })).toBeVisible();
  const link = await page.locator('code').first().textContent();
  expect(link).toMatch(/\/cadastro\?indicacao=[A-Z0-9]+$/);

  await page.getByRole('link', { name: 'Abrir o painel' }).click();
  await expect(page.getByRole('heading', { name: 'Suas indicações' })).toBeVisible();
  await expect(page.getByText('Barbearias indicadas')).toBeVisible();

  await page.goto(new URL(link!).pathname + new URL(link!).search);
  await expect(page.getByText(/Você veio pela indicação de um amigo: são 30 dias/)).toBeVisible();
});
