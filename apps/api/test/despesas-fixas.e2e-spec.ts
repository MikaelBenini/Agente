// Despesas fixas no mês seguinte (pedido do dono em 11/11/2026): prévia das fixas do mês
// anterior, cópia com o valor editado, sem duplicar; o gestor só copia as da unidade dele.
import type { INestApplication } from '@nestjs/common';
import type { DespesaDetalhe, FixaParaCopiar } from '@pente-fino/shared';
import type { App } from 'supertest/types.js';
import { como, criarApp, criarCenario, type Cenario } from './ajudantes.js';

let app: INestApplication<App>;
let a: Cenario;
type Cliente = Awaited<ReturnType<typeof como>>;
let dono: Cliente;
let gestor: Cliente;
let aluguel = '';
let internetB = '';
let fixa = '';

beforeAll(async () => {
  app = await criarApp();
  a = await criarCenario();
  dono = await como(app, a.emails.dono);
  gestor = await como(app, a.emails.gestor);
  fixa = (await dono.post('/categorias-despesa', { nome: 'Aluguel', grupo: 'fixa' }).expect(201))
    .body.id as string;
  const variavel = (
    await dono.post('/categorias-despesa', { nome: 'Material', grupo: 'variavel' }).expect(201)
  ).body.id as string;
  const lancar = async (corpo: object) =>
    ((await dono.post('/despesas', corpo).expect(201)).body as DespesaDetalhe).id;
  aluguel = await lancar({
    unidadeId: a.unidadeA,
    categoriaId: fixa,
    descricao: 'Aluguel da loja',
    valor: 250000,
    competencia: '2025-01',
    vencimento: '2025-01-31',
    pago: true,
    repetir: true,
  });
  internetB = await lancar({
    unidadeId: a.unidadeB,
    categoriaId: fixa,
    descricao: 'Internet da unidade B',
    valor: 15000,
    competencia: '2025-01',
  });
  // Variável não entra na cópia das fixas.
  await lancar({
    unidadeId: a.unidadeA,
    categoriaId: variavel,
    descricao: 'Lâminas',
    valor: 8000,
    competencia: '2025-01',
  });
});

afterAll(async () => {
  await a.remover();
  await app.close();
});

describe('copiar fixas do mês anterior', () => {
  it('prévia com as fixas e o vencimento no mês seguinte; copia com o valor editado, uma vez só', async () => {
    const previa = (await dono.get('/despesas/fixas-para-copiar?mes=2025-02').expect(200))
      .body as FixaParaCopiar[];
    expect(previa.map((f) => [f.descricao, f.vencimento, f.repetir, f.jaLancada])).toEqual([
      ['Aluguel da loja', '2025-02-28', true, false],
      ['Internet da unidade B', null, false, false],
    ]);

    // O gestor da unidade A não copia a despesa da unidade B.
    await gestor
      .post('/despesas/copiar-fixas', {
        mes: '2025-02',
        itens: [{ origemId: internetB, valor: 15000, vencimento: null }],
      })
      .expect(403);
    expect(
      (
        (await gestor.get('/despesas/fixas-para-copiar?mes=2025-02').expect(200))
          .body as FixaParaCopiar[]
      ).map((f) => f.descricao),
    ).toEqual(['Aluguel da loja']);

    const copiadas = (
      await dono
        .post('/despesas/copiar-fixas', {
          mes: '2025-02',
          itens: [{ origemId: aluguel, valor: 260000, vencimento: '2025-02-28' }],
        })
        .expect(201)
    ).body as DespesaDetalhe[];
    expect(copiadas).toEqual([
      expect.objectContaining({
        descricao: 'Aluguel da loja',
        valor: 260000,
        competencia: '2025-02',
        vencimento: '2025-02-28',
        pago: false,
        repetir: true,
      }),
    ]);

    // Já veio: sai da prévia, e copiar de novo não duplica (409).
    expect(
      (
        (await dono.get('/despesas/fixas-para-copiar?mes=2025-02').expect(200))
          .body as FixaParaCopiar[]
      ).map((f) => f.descricao),
    ).toEqual(['Internet da unidade B']);
    await dono
      .post('/despesas/copiar-fixas', {
        mes: '2025-02',
        itens: [{ origemId: aluguel, valor: 260000, vencimento: null }],
      })
      .expect(409);
    const fevereiro = (await dono.get('/despesas?mes=2025-02').expect(200))
      .body as DespesaDetalhe[];
    expect(fevereiro.filter((d) => d.descricao === 'Aluguel da loja')).toHaveLength(1);

    // Lançada à mão neste mês (sem a ligação da cópia): a prévia avisa, para não duplicar.
    await dono
      .post('/despesas', {
        unidadeId: a.unidadeB,
        categoriaId: fixa,
        descricao: 'Internet da unidade B',
        valor: 15000,
        competencia: '2025-02',
      })
      .expect(201);
    expect(
      (
        (await dono.get('/despesas/fixas-para-copiar?mes=2025-02').expect(200))
          .body as FixaParaCopiar[]
      ).map((f) => [f.descricao, f.jaLancada]),
    ).toEqual([['Internet da unidade B', true]]);

    // Só do mês anterior: a de janeiro não vai para março.
    await dono
      .post('/despesas/copiar-fixas', {
        mes: '2025-03',
        itens: [{ origemId: internetB, valor: 15000, vencimento: null }],
      })
      .expect(404);
  });
});

// Decisão do dono em 16/11/2026: o salário (valor fixo em Equipe) entra na prévia das fixas.
describe('salário dos barbeiros na cópia das fixas', () => {
  it('uma linha por barbeiro com valor fixo; copia com o valor editado, uma vez por mês', async () => {
    const prof = (
      await dono
        .post('/profissionais', {
          unidadeId: a.unidadeA,
          nome: 'Saulo Salário',
          email: `saulo-${Date.now()}@e2e.pentefino.dev`,
          dataEntrada: '2025-01-01',
          comissaoServico: { percentualBp: 4000, valorFixo: null },
          comissaoProduto: { percentualBp: 1000, valorFixo: null },
        })
        .expect(201)
    ).body.id as string;
    const salarios = async (cliente: Cliente, mes: string) =>
      (
        (await cliente.get(`/despesas/fixas-para-copiar?mes=${mes}`).expect(200))
          .body as FixaParaCopiar[]
      ).filter((f) => f.profissionalId);

    // Só comissão (sem valor fixo): nenhuma linha de salário.
    expect(await salarios(dono, '2025-06')).toEqual([]);
    await dono.patch(`/profissionais/${prof}`, { custoFixoMensal: 180_000 }).expect(200);
    expect(await salarios(dono, '2025-06')).toEqual([
      expect.objectContaining({
        origemId: null,
        profissionalId: prof,
        unidadeId: a.unidadeA,
        categoria: 'Salários e encargos',
        descricao: 'Salário: Saulo Salário',
        valor: 180_000,
        jaLancada: false,
      }),
    ]);
    // O gestor da unidade A vê e copia o salário do barbeiro dela.
    expect((await salarios(gestor, '2025-06')).map((f) => f.profissionalId)).toEqual([prof]);

    const copiadas = (
      await gestor
        .post('/despesas/copiar-fixas', {
          mes: '2025-06',
          itens: [{ profissionalId: prof, valor: 185_000, vencimento: '2025-06-05' }],
        })
        .expect(201)
    ).body as DespesaDetalhe[];
    expect(copiadas).toEqual([
      expect.objectContaining({
        descricao: 'Salário: Saulo Salário',
        valor: 185_000,
        competencia: '2025-06',
        vencimento: '2025-06-05',
        pago: false,
      }),
    ]);

    // Já veio: sai da prévia e não duplica; no mês seguinte volta a aparecer.
    expect(await salarios(dono, '2025-06')).toEqual([]);
    await dono
      .post('/despesas/copiar-fixas', {
        mes: '2025-06',
        itens: [{ profissionalId: prof, valor: 185_000, vencimento: null }],
      })
      .expect(409);
    const junho = (await dono.get('/despesas?mes=2025-06').expect(200)).body as DespesaDetalhe[];
    expect(junho.filter((d) => d.descricao === 'Salário: Saulo Salário')).toHaveLength(1);
    // A despesa de salário de junho não vira linha "do mês anterior" em julho: vem do cadastro.
    const julho = (await dono.get('/despesas/fixas-para-copiar?mes=2025-07').expect(200))
      .body as FixaParaCopiar[];
    expect(julho.filter((f) => f.descricao === 'Salário: Saulo Salário')).toEqual([
      expect.objectContaining({ origemId: null, profissionalId: prof, valor: 180_000 }),
    ]);

    // Barbeiro de outra conta ou inexistente: 404; os dois ao mesmo tempo no item: 400.
    await dono
      .post('/despesas/copiar-fixas', {
        mes: '2025-06',
        itens: [
          { profissionalId: '0193a5b2-7c1d-7e8f-9a0b-1c2d3e4f5a6c', valor: 1, vencimento: null },
        ],
      })
      .expect(404);
    await dono
      .post('/despesas/copiar-fixas', {
        mes: '2025-06',
        itens: [{ profissionalId: prof, origemId: aluguel, valor: 1, vencimento: null }],
      })
      .expect(400);
  });
});

// Pedido do dono em 16/11/2026: "o salário não aparece como fixo". Agora entra sozinho no mês.
describe('salário automático nas despesas fixas do mês', () => {
  it('aparece ao definir o valor fixo, acompanha a mudança e sai quando o valor zera', async () => {
    const mes = new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 7);
    const prof = (
      await dono
        .post('/profissionais', {
          unidadeId: a.unidadeA,
          nome: 'Tadeu Automático',
          email: `tadeu-${Date.now()}@e2e.pentefino.dev`,
          dataEntrada: '2025-01-01',
          comissaoServico: { percentualBp: 4000, valorFixo: null },
          comissaoProduto: { percentualBp: 1000, valorFixo: null },
        })
        .expect(201)
    ).body.id as string;
    const salarios = async () =>
      ((await dono.get(`/despesas?mes=${mes}`).expect(200)).body as DespesaDetalhe[]).filter(
        (d) => d.descricao === 'Salário: Tadeu Automático',
      );
    expect(await salarios()).toEqual([]);
    await dono.patch(`/profissionais/${prof}`, { custoFixoMensal: 200_000 }).expect(200);
    expect(await salarios()).toEqual([
      expect.objectContaining({ valor: 200_000, pago: false, competencia: mes }),
    ]);
    // Abrir de novo não duplica; mudar o valor atualiza o do mês.
    expect(await salarios()).toHaveLength(1);
    await dono.patch(`/profissionais/${prof}`, { custoFixoMensal: 210_000 }).expect(200);
    expect((await salarios()).map((d) => d.valor)).toEqual([210_000]);
    await dono.patch(`/profissionais/${prof}`, { custoFixoMensal: 0 }).expect(200);
    expect(await salarios()).toEqual([]);
  });
});
