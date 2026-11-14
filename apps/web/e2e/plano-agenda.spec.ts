import { expect, test } from '@playwright/test';

// Plano Agenda, revenda conforme a necessidade: o Início mostra a agenda do mês, as telas do
// Básico ficam no menu com cadeado e o dono experimenta o Básico por 7 dias, uma vez só.
test('Agenda: agenda do mês no Início, cadeado no menu e o Básico por 7 dias', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'celular', 'o menu lateral é do computador');
  const sufixo = Date.now().toString(36);
  await page.goto('/cadastro?plano=agenda');
  await page.getByLabel('Nome da barbearia').fill(`Barbearia Agenda ${sufixo}`);
  await page.getByLabel('Seu nome').fill('Dono Agenda');
  await page.getByLabel('E-mail').fill(`agenda-${sufixo}@e2e.pentefino.dev`);
  await page.getByLabel('Senha').fill('senha-forte-123');
  await page.getByText('Li e aceito').click();
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await page.waitForURL(/configuracao-inicial/);

  await page.goto('/inicio');
  await expect(page.getByRole('heading', { name: /^A agenda de / })).toBeVisible();
  await expect(page.getByText('Entrou hoje')).toHaveCount(0);
  const menu = page.getByRole('navigation', { name: 'Menu principal' });
  const noBasico = menu.getByRole('list', { name: 'No plano Básico' });
  await expect(noBasico.getByRole('link', { name: /Comandas/ })).toBeVisible();

  // Abrir uma tela do Básico mostra o que ela faz e o convite.
  await page.goto('/comandas');
  await expect(page.getByText('Faz parte do plano Básico')).toBeVisible();
  await page.getByRole('button', { name: 'Experimentar 7 dias' }).click();
  // Durante a experiência, as telas do Básico voltam ao menu, sem cadeado.
  await expect(noBasico).toHaveCount(0);
  await expect(menu.getByRole('link', { name: 'Comandas', exact: true })).toBeVisible();
  await page.goto('/inicio');
  await expect(page.getByText('Entrou hoje')).toBeVisible();
});
