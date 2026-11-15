// Fotos das telas para o vídeo novo (roteiro em video/roteiro.md), tiradas da conta de
// demonstração no banco limpo. Grava em apps/video/public/telas/*.webp.
//   ./video/banco.sh && ./video/servidores.sh   (em outro terminal)
//   node video/fotos-video.mjs
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DESTINO = process.env.DESTINO ?? path.resolve(AQUI, '../../video/public/telas');
const B = process.env.VIDEO_BASE ?? 'http://localhost:3200';
await mkdir(DESTINO, { recursive: true });
const navegador = await chromium.launch();
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
// No domingo a unidade da demonstração não abre: agenda e caixa mostram o sábado.
const hojeSP = new Date(Date.now() - 3 * 3600_000);
const domingo = hojeSP.getUTCDay() === 0;
const sabado = new Date(hojeSP.getTime() - 86_400_000).toISOString().slice(0, 10);

// Conversa do bot na foto 9: oi, agendar, por aqui, Corte + Barba, sem mais, Diego, dia, horário, confirmar.
const CONVERSA_BOT = (process.env.CONVERSA_BOT ?? 'oi,1,1,3,0,1,1,1,1').split(',');

const computador = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
const celular = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
};

async function entrar(email, opcoes) {
  const ctx = await navegador.newContext({
    colorScheme: 'dark',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    ...opcoes,
  });
  const p = await ctx.newPage();
  await p.goto(`${B}/entrar`);
  await p.getByLabel('E-mail').fill(email);
  await p.getByLabel('Senha').fill('pentefino123');
  await p.getByRole('button', { name: 'Entrar' }).click();
  await p.waitForURL(/inicio|agenda|hoje|dia|comandas/);
  return { ctx, p };
}

/** Grava a foto em WebP (1920 de largura no computador, 780 no celular). */
async function salvar(p, nome, largura) {
  await p.evaluate(() => {
    for (const el of document.querySelectorAll('[role="status"]'))
      if (/esperando atendente|Confirme seu e-mail|WhatsApp caiu/.test(el.textContent ?? ''))
        el.remove();
  });
  await espera(700);
  const png = await p.screenshot();
  await sharp(png)
    .resize({ width: largura })
    .webp({ quality: 90 })
    .toFile(path.join(DESTINO, `${nome}.webp`));
  console.log(`telas/${nome}.webp`);
}

const api = (p, metodo, caminho, corpo) =>
  p.request[metodo](`${B}/api/${caminho}`, {
    ...(corpo ? { data: corpo } : {}),
    headers: { origin: B },
  });

// ─── Dono, no computador ───────────────────────────────────────────────────
{
  const { ctx, p } = await entrar('dono@demo.pentefino.dev', computador);
  // 2. Lucro do mês (outubro fechado).
  await p.goto(`${B}/financeiro`);
  await p.getByRole('button', { name: 'Mês anterior' }).first().click();
  await p
    .getByText(/outubro/i)
    .first()
    .waitFor();
  await salvar(p, '02-financeiro', 1920);
  // 3. Margem de cada serviço.
  await p.goto(`${B}/resultados?aba=itens`);
  await p.getByRole('button', { name: 'Mês anterior' }).first().click();
  await p
    .getByText(/outubro/i)
    .first()
    .waitFor();
  await p.getByText('Corte + Barba').first().waitFor({ timeout: 60000 });
  await salvar(p, '03-margem', 1920);
  // 6a. Comissões do mês (aba do Financeiro, outubro).
  await p.goto(`${B}/financeiro`);
  await p.getByRole('button', { name: 'Mês anterior' }).first().click();
  await p.getByRole('tab', { name: 'Comissões' }).click();
  await espera(1200);
  await salvar(p, '06-comissoes', 1920);
  // 8b. Lista de espera e lembretes (regras do agendamento).
  await p.goto(`${B}/configuracoes?aba=agendamento`);
  await p.getByRole('tab', { name: 'Agendamento', exact: true }).click();
  await p.getByText('Lembretes pelo WhatsApp').first().scrollIntoViewIfNeeded();
  await salvar(p, '08-lembretes', 1920);
  // 9. O bot marcando (simulador do painel, aba Testar). O simulador usa a hora de agora: fora do
  // horário ou num feriado ele abre com "estamos fechados". Só neste banco do vídeo, o dia de hoje
  // vira dia de trabalho no calendário e o bot fica 24 h no ar durante a foto; depois volta tudo.
  const unidadesBot = await (await api(p, 'get', 'unidades')).json();
  const centroBot = unidadesBot.find((u) => u.nome === 'Centro') ?? unidadesBot[0];
  const hoje = hojeSP.toISOString().slice(0, 10);
  const calendario = await (
    await api(p, 'get', `unidades/${centroBot.id}/calendario?de=${hoje}&ate=${hoje}`)
  ).json();
  const diaAntes = Array.isArray(calendario) ? calendario.find((d) => d.data === hoje) : null;
  await api(p, 'put', `unidades/${centroBot.id}/calendario/${hoje}`, { trabalha: true });
  const todoDia = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ diaSemana: d, inicioMin: 0, fimMin: 1440 }));
  await api(p, 'put', `bot/horario/${centroBot.id}`, { turnos: todoDia });
  try {
    await p.goto(`${B}/bot`);
    await p.getByRole('tab', { name: 'Testar' }).click();
    await p
      .getByLabel('Unidade')
      .selectOption({ label: 'Centro' })
      .catch(() => {});
    await p
      .getByLabel('Testar')
      .selectOption({ label: 'O menu publicado' })
      .catch(() => {});
    const msg = p.getByPlaceholder('Mensagem do cliente');
    for (const t of CONVERSA_BOT) {
      await msg.fill(t);
      await msg.press('Enter');
      await espera(1500);
    }
    // A conversa fica maior que a tela: rola até o "Pronto, horário marcado!".
    await p.getByText('Pronto, horário marcado!').scrollIntoViewIfNeeded();
    await p.evaluate(() => {
      document.activeElement?.blur?.();
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    await salvar(p, '09-bot', 1920);
  } finally {
    await api(p, 'put', `bot/horario/${centroBot.id}`, { turnos: null });
    if (diaAntes)
      await api(p, 'put', `unidades/${centroBot.id}/calendario/${hoje}`, {
        trabalha: diaAntes.trabalha,
        motivo: diaAntes.motivo,
      });
    else await api(p, 'delete', `unidades/${centroBot.id}/calendario/${hoje}`);
  }
  // 11. Clube de assinatura. A demonstração não tem clube: cria um plano e assinantes pela
  // própria API, só neste banco do vídeo (uma vez).
  const unidadesClube = await (await api(p, 'get', 'unidades')).json();
  const centroClube = unidadesClube.find((u) => u.nome === 'Centro') ?? unidadesClube[0];
  const itens = await (await api(p, 'get', 'clube/itens')).json();
  if (!itens.length) {
    const servicos = await (await api(p, 'get', 'servicos')).json();
    const id = (nome) => servicos.find((x) => x.nome === nome)?.id;
    const item = await (
      await api(p, 'post', 'clube/itens', {
        unidadeId: centroClube.id,
        tipo: 'assinatura',
        nome: 'Clube Corte + Barba',
        descricao: 'Corte e barba à vontade no mês.',
        valor: 12990,
        limiteUsoMes: null,
        servicos: [
          { servicoId: id('Corte'), quantidade: null, comissaoValorFixo: null },
          { servicoId: id('Barba'), quantidade: null, comissaoValorFixo: null },
        ],
      })
    ).json();
    const clientes = await (await api(p, 'get', 'clientes?busca=')).json();
    for (const c of clientes.slice(0, 9))
      await api(p, 'post', 'clube/adesoes', {
        clienteId: c.id,
        itemClubeId: item.id,
        inicio: hojeSP.toISOString().slice(0, 10),
      });
  }
  await p.goto(`${B}/clube`);
  await p.getByRole('heading', { level: 1 }).waitFor();
  await espera(800);
  await salvar(p, '11-clube', 1920);

  // 10. Site da barbearia publicado, em dois temas.
  const unidades = await (await api(p, 'get', 'unidades')).json();
  const centro = unidades.find((u) => u.nome === 'Centro') ?? unidades[0];
  const painel = await (await api(p, 'get', `unidades/${centro.id}/site`)).json();
  const publicar = async (tema) => {
    await api(p, 'put', `unidades/${centro.id}/site`, { ...painel.rascunho, tema });
    return (await api(p, 'post', `unidades/${centro.id}/site/publicar`, {})).json();
  };
  const publicado = await publicar('tradicional');
  const endereco = `${B}/s/${publicado.siteSlug ?? 'demo-centro'}`;
  await ctx.close();
  const site = await navegador.newContext({
    colorScheme: 'dark',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    ...computador,
  });
  const s = await site.newPage();
  await s.goto(endereco);
  await espera(1500);
  await salvar(s, '10-site-a', 1920);
  const { ctx: c2, p: p2 } = await entrar('dono@demo.pentefino.dev', computador);
  // A página pública fica em cache: o segundo tema aparece no editor da Minha página.
  await p2.goto(`${B}/pagina`);
  await p2.getByRole('tab', { name: 'Tema' }).click();
  await p2.getByRole('tab', { name: 'Tema' }).scrollIntoViewIfNeeded();
  await p2.mouse.wheel(0, 250);
  await espera(1500);
  await salvar(p2, '10-site-b', 1920);
  await c2.close();
  await site.close();
}

// ─── Recepção, no computador ───────────────────────────────────────────────
{
  const { ctx, p } = await entrar('recepcao.centro@demo.pentefino.dev', computador);
  // 4b. A agenda do dia (no domingo a unidade não abre: o sábado anterior).
  await p.goto(`${B}/agenda`);
  await p.getByRole('heading', { level: 1 }).waitFor();
  if (domingo) await p.getByRole('button', { name: 'Anterior', exact: true }).click();
  await espera(1200);
  await salvar(p, '04-agenda', 1920);
  // 7. Caixa do dia (no domingo, o do sábado).
  await p.goto(`${B}/caixa`);
  await p.getByRole('heading', { level: 1 }).waitFor();
  if (domingo) await p.getByLabel('Dia').fill(sabado);
  await p.evaluate(() => document.activeElement?.blur?.());
  await espera(800);
  await salvar(p, '07-caixa', 1920);
  await ctx.close();
}

// ─── Cliente, no celular: o link de agendamento ───────────────────────────
{
  const ctx = await navegador.newContext({
    colorScheme: 'dark',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    ...celular,
  });
  const p = await ctx.newPage();
  await p.goto(`${B}/b/demo-centro`);
  await p.getByRole('heading', { level: 1 }).waitFor();
  await espera(1000);
  await salvar(p, '04-link', 780);
  await ctx.close();
}

// ─── Barbeiro, no celular ──────────────────────────────────────────────────
{
  const { ctx, p } = await entrar('rafael@demo.pentefino.dev', celular);
  // 5. A comanda do horário.
  await p.goto(`${B}/comandas`);
  const comanda = p.locator('a[href*="/comandas?id="]').first();
  if (await comanda.isVisible({ timeout: 5000 }).catch(() => false)) {
    await comanda.click();
    await p.getByRole('heading', { level: 1 }).waitFor();
    await salvar(p, '05-comanda', 780);
  } else console.log('sem comanda hoje para o barbeiro: 05-comanda não gravada');
  // 6b. O extrato do barbeiro.
  await p.goto(`${B}/comissoes`);
  await espera(1200);
  await salvar(p, '06-extrato', 780);
  await ctx.close();
}

await navegador.close();
