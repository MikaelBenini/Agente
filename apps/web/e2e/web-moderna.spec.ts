import { expect, test, type Page } from '@playwright/test';

// Melhorias da skill modern-web-guidance (pedido do dono em 15/11): instalar o app, fechar a
// janela tocando fora, erro do campo ao sair dele, vídeo preguiçoso e tabela em cartões no celular.
async function entrar(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('pentefino123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/inicio|agenda|hoje|comandas/);
}

/** O navegador avisa que dá para instalar (no teste, um aviso falso que aceita). */
const avisoDeInstalar = (page: Page) =>
  page.evaluate(() => {
    const e = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(e, {
      prompt: () => Promise.resolve(),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    });
    dispatchEvent(e);
  });

test('instalar o app: botão no Perfil quando o navegador deixa, e o convite no celular', async ({
  page,
}, info) => {
  await entrar(page, 'rafael@demo.pentefino.dev');
  await page.goto('/perfil');
  // Sem o aviso do navegador (e fora do iPhone), nada de botão que não funciona.
  await expect(page.getByRole('heading', { name: 'App na tela do celular' })).toHaveCount(0);
  await avisoDeInstalar(page);
  const secao = page.getByRole('region', { name: 'App na tela do celular' });
  await expect(secao).toBeVisible();
  const convite = page.getByRole('region', { name: 'Instale o Pente Fino no celular' });
  if (info.project.name === 'celular') await expect(convite).toBeVisible();
  else await expect(convite).toBeHidden();
  await secao.getByRole('button', { name: 'Instalar o app' }).click();
  await expect(secao.getByRole('status')).toHaveText(
    'Pronto: o Pente Fino está na tela do celular.',
  );
});

test('convite para instalar: quem fecha não vê de novo', async ({ page }, info) => {
  test.skip(info.project.name !== 'celular', 'o convite é só no celular');
  await entrar(page, 'rafael@demo.pentefino.dev');
  await avisoDeInstalar(page);
  const convite = page.getByRole('region', { name: 'Instale o Pente Fino no celular' });
  await convite.getByRole('button', { name: 'Fechar o convite para instalar' }).click();
  await expect(convite).toBeHidden();
  await page.reload();
  await avisoDeInstalar(page);
  await expect(page.getByRole('region', { name: 'App na tela do celular' })).toHaveCount(0);
  await expect(convite).toBeHidden();
});

test('janela só de leitura fecha tocando fora; a de formulário não', async ({ page }, info) => {
  await entrar(page, 'dono@demo.pentefino.dev');
  await page.goto('/clientes');
  if (info.project.name === 'celular')
    await page.getByRole('button', { name: 'Procurar', exact: true }).click();
  else await page.keyboard.press('Control+k');
  const busca = page.getByRole('dialog', { name: 'Procurar' });
  await expect(busca).toBeVisible();
  await page.mouse.click(4, 4);
  await expect(busca).toBeHidden();

  await page.getByRole('button', { name: /Novo cliente/ }).click();
  const novo = page.getByRole('dialog', { name: 'Novo cliente' });
  await novo.getByLabel('Nome').fill('Não pode sumir');
  await page.mouse.click(4, 4);
  await expect(novo).toBeVisible();
  await expect(novo.getByLabel('Nome')).toHaveValue('Não pode sumir');
});

test('campo com máscara: número pela metade vira erro só ao sair do campo', async ({ page }) => {
  await page.goto('/cadastro');
  const campo = page.getByLabel('WhatsApp (opcional)');
  await campo.pressSequentially('1198');
  await expect(campo).toHaveAttribute('aria-invalid', 'false');
  await expect(page.getByText('Número incompleto')).toHaveCount(0);
  await campo.blur();
  await expect(page.getByText('Número incompleto: confira o DDD e o número.')).toBeVisible();
  await expect(campo).toHaveAttribute('aria-invalid', 'true');
  await campo.pressSequentially('887777');
  await expect(page.getByText('Número incompleto')).toHaveCount(0);
});

test('vídeo da página inicial só carrega perto de aparecer', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('video#apresentacao')).toHaveAttribute('loading', 'lazy');
});

test('comparação no celular: um cartão por linha, com o nome da coluna', async ({ page }, info) => {
  test.skip(info.project.name !== 'celular', 'cartões só na largura do celular');
  await page.goto('/comparativo/trinks');
  const tabela = page.getByRole('table', { name: 'Pente Fino e Trinks lado a lado' });
  await expect(tabela.locator('thead')).toBeHidden();
  const celula = tabela.locator('td[data-coluna="Pente Fino"]').first();
  const rotulo = await celula.evaluate((td) => getComputedStyle(td, '::before').content);
  expect(rotulo).toContain('Pente Fino');
  // Nada rola para o lado na tela.
  const [rolagem, tela] = await page.evaluate(
    () => [document.documentElement.scrollWidth, document.documentElement.clientWidth] as const,
  );
  expect(rolagem).toBeLessThanOrEqual(tela);
});
