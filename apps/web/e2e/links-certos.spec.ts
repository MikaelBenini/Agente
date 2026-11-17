import { expect, test, type Page } from '@playwright/test';

// Revisão de 16/11/2026: o aviso abria a unidade errada e o "Agendar corte infantil" do site
// abria a reserva sem o serviço.
async function entrar(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('dono@demo.pentefino.dev');
  await page.getByLabel('Senha', { exact: true }).fill('pentefino123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.waitForURL(/inicio|agenda|hoje/);
}

test('reserva aberta pelo site já vem com o serviço escolhido', async ({ page }) => {
  const r = await page.request.get('/api/publico/agendamento/demo-centro');
  const u = (await r.json()) as { servicos: { id: string; nome: string }[] };
  const servico = u.servicos[u.servicos.length - 1]!;
  await page.goto(`/b/demo-centro?servico=${servico.id}`);
  await expect(
    page.getByRole('checkbox', { name: new RegExp(servico.nome) }).first(),
  ).toBeChecked();
  // Sem o parâmetro, nada vem marcado.
  await page.goto('/b/demo-centro');
  await expect(
    page.getByRole('checkbox', { name: new RegExp(servico.nome) }).first(),
  ).not.toBeChecked();
});

test('link com ?unidade= (aviso) abre o painel naquela unidade e sai do endereço', async ({
  page,
}) => {
  await entrar(page);
  // A unidade de destino (Jardins), pela mesma API que o painel usa (sessão por cookie).
  const lista = (await (await page.request.get('/api/unidades')).json()) as {
    id: string;
    nome: string;
  }[];
  const jardins = lista.find((u) => /Jardins/.test(u.nome))!;
  const id = jardins.id;
  await page.goto(`/dia?dia=2026-11-16&unidade=${id}`);
  await expect(page.getByRole('link', { name: /Jardins/ }).first()).toBeVisible();
  await expect(page).not.toHaveURL(/unidade=/);
});
