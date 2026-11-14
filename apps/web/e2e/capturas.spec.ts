import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, test, type Browser, type Page } from '@playwright/test';
import sharp from 'sharp';

// Capturas das telas para a página de vendas (pedido do dono em 12/11: "capturas de tela novas
// das telas atuais"). Não roda na bateria nem no CI: só com CAPTURAS=1, contra os dados da
// demonstração. Grava em public/site o WebP em tamanho cheio e o de metade da largura, com os
// mesmos nomes de TELAS (componentes/site/vitrine.tsx).
//   CAPTURAS=1 E2E_PORTA_WEB=3100 E2E_PORTA_API=3101 pnpm --filter @pente-fino/web test:e2e e2e/capturas.spec.ts --project=computador
test.skip(!process.env.CAPTURAS, 'só com CAPTURAS=1');

const PASTA = fileURLToPath(new URL('../public/site/', import.meta.url));

async function entrar(browser: Browser, email: string, celular: boolean): Promise<Page> {
  const contexto = await browser.newContext({
    viewport: celular ? { width: 390, height: 664 } : { width: 800, height: 500 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    storageState: {
      cookies: [],
      origins: [
        {
          origin: process.env.E2E_URL ?? 'http://localhost:3100',
          localStorage: [{ name: 'pf-cookies', value: 'recusado' }],
        },
      ],
    },
  });
  const page = await contexto.newPage();
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('pentefino123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/inicio|agenda|hoje|comandas/);
  return page;
}

/** Grava a captura e a versão com metade da largura. */
async function gravar(page: Page, nome: string, largura: number, altura: number) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  const png = await page.screenshot({ fullPage: false });
  await mkdir(PASTA, { recursive: true });
  const base = sharp(png).resize(largura, altura, { fit: 'cover', position: 'top' });
  await base.clone().webp({ quality: 82 }).toFile(`${PASTA}${nome}.webp`);
  await base
    .clone()
    .resize(Math.round(largura / 2))
    .webp({ quality: 80 })
    .toFile(`${PASTA}${nome}-${Math.round(largura / 2)}.webp`);
}

test('capturas do computador (dono)', async ({ browser }) => {
  test.setTimeout(120_000);
  const page = await entrar(browser, 'dono@demo.pentefino.dev', false);
  await page.setViewportSize({ width: 800, height: 422 });
  await page.goto('/financeiro');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await gravar(page, 'financeiro', 1600, 844);
  await page.goto('/resultados');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await gravar(page, 'metas', 1600, 844);
  await page.setViewportSize({ width: 800, height: 500 });
  await page.goto('/agenda');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await gravar(page, 'agenda', 1600, 1000);
  await page.goto('/resultados?aba=itens');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await gravar(page, 'lucro-produtos', 1600, 1000);
});

test('capturas do celular (barbeiro)', async ({ browser }) => {
  test.setTimeout(120_000);
  const page = await entrar(browser, 'rafael@demo.pentefino.dev', true);
  await page.goto('/desempenho');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await gravar(page, 'celular-desempenho', 780, 1328);
  await page.goto('/comandas');
  await page.locator('a[href*="/comandas?id="]').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await gravar(page, 'celular-comanda', 780, 1328);
});
