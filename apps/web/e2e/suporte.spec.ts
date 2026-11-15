import { expect, test } from '@playwright/test';

// Admin F5: o dono libera o acesso do suporte por 24 horas e cancela quando quiser.
test('dono libera e cancela o acesso do suporte nas Configurações', async ({ page }, info) => {
  test.skip(info.project.name === 'celular', 'a mesma conta nos dois aparelhos: um só basta');
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('dono@demo.pentefino.dev');
  await page.getByLabel('Senha').fill('pentefino123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/inicio/);
  await page.goto('/configuracoes?aba=suporte');
  const secao = page.getByRole('region', { name: 'Acesso do suporte' });
  await expect(secao).toContainText('só leitura');
  await secao.getByRole('button', { name: 'Liberar por 24 horas' }).click();
  await expect(secao.getByRole('status')).toContainText('Liberado até');
  await secao.getByRole('button', { name: 'Cancelar o acesso agora' }).click();
  await expect(secao.getByRole('button', { name: 'Liberar por 24 horas' })).toBeVisible();
});

// Admin F6: o chat com o suporte na Ajuda, para quem já é cliente (sem nome nem contato).
test('cliente fala com o suporte pelo chat da Ajuda', async ({ page }, info) => {
  test.skip(info.project.name === 'celular', 'a mesma conta nos dois aparelhos: um só basta');
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('gestor@demo.pentefino.dev');
  await page.getByLabel('Senha').fill('pentefino123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/inicio|agenda|hoje/);
  await page.goto('/ajuda');
  const contato = page.getByRole('region', { name: 'Falar com o suporte' });
  const texto = `Dúvida do teste ${Date.now()}`;
  await contato.getByLabel('Mensagem para o suporte').fill(texto);
  await contato.getByRole('button', { name: 'Enviar ao suporte' }).click();
  await expect(contato.getByRole('list', { name: 'Mensagens com o suporte' })).toContainText(texto);
  await expect(contato.getByRole('status')).toBeVisible();
});

// Admin F6: o chat também em todo o painel, no botão ao lado do sino; a Ajuda não mostra mais o
// WhatsApp.
test('chat do suporte no botão ao lado do sino, fora da Ajuda', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('gestor@demo.pentefino.dev');
  await page.getByLabel('Senha').fill('pentefino123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/inicio|agenda|hoje/);
  await page.getByRole('button', { name: 'Falar com o suporte' }).filter({ visible: true }).click();
  const painel = page.getByRole('dialog', { name: 'Falar com o suporte' });
  await expect(painel.getByLabel('Mensagem para o suporte')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(painel).toBeHidden();
  await page.goto('/ajuda');
  await expect(page.getByRole('button', { name: 'Falar com o suporte' })).toHaveCount(0);
  await expect(page.getByText('WhatsApp do suporte')).toHaveCount(0);
});
