// "Copiar de outra unidade" (aprovado pelo dono em 16/11/2026): só os itens marcados vêm; o que a
// unidade já marcou no calendário fica; o gestor precisa alcançar as duas unidades.
import type { INestApplication } from '@nestjs/common';
import type { RegrasAgendamento, ResultadoCopiaConfiguracoes } from '@pente-fino/shared';
import type { App } from 'supertest/types.js';
import { como, criarApp, criarCenario, type Cenario } from './ajudantes.js';

let app: INestApplication<App>;
let a: Cenario;
type Cliente = Awaited<ReturnType<typeof como>>;
let dono: Cliente;
let gestor: Cliente;

beforeAll(async () => {
  app = await criarApp();
  a = await criarCenario();
  dono = await como(app, a.emails.dono);
  gestor = await como(app, a.emails.gestor);
});

afterAll(async () => {
  await a.remover();
  await app.close();
});

const turnos = [
  { diaSemana: 2, inicioMin: 9 * 60, fimMin: 18 * 60 },
  { diaSemana: 6, inicioMin: 8 * 60, fimMin: 13 * 60 },
];

describe('copiar configurações de outra unidade', () => {
  it('copia só o que foi marcado e mantém o que a unidade já tinha no calendário', async () => {
    const A = a.unidadeA;
    const B = a.unidadeB;
    await dono.put(`/unidades/${A}/funcionamento`, { turnos }).expect(200);
    const regrasA = (await dono.get(`/unidades/${A}/regras-agendamento`).expect(200))
      .body as RegrasAgendamento;
    await dono
      .put(`/unidades/${A}/regras-agendamento`, { ...regrasA, antecedenciaMin: 180 })
      .expect(200);
    await dono
      .put(`/unidades/${A}/calendario/2027-12-25`, { trabalha: false, motivo: 'Natal' })
      .expect(200);
    await dono
      .put(`/unidades/${A}/calendario/2027-12-31`, { trabalha: false, motivo: 'Réveillon' })
      .expect(200);
    // Passado não vem; o dia que B já marcou fica como está.
    await dono.put(`/unidades/${A}/calendario/2025-01-01`, { trabalha: false }).expect(200);
    await dono
      .put(`/unidades/${B}/calendario/2027-12-31`, { trabalha: true, motivo: 'Abre' })
      .expect(200);
    const regrasB = (await dono.get(`/unidades/${B}/regras-agendamento`).expect(200))
      .body as RegrasAgendamento;

    const r = (
      await dono
        .post(`/unidades/${B}/copiar-configuracoes`, {
          deUnidadeId: A,
          itens: ['funcionamento', 'calendario'],
        })
        .expect(200)
    ).body as ResultadoCopiaConfiguracoes;
    expect(r).toEqual({ funcionamento: 1, calendario: 1 });

    expect((await dono.get(`/unidades/${B}/funcionamento`).expect(200)).body.turnos).toEqual(
      turnos,
    );
    // Regras não foram marcadas: B continua com as dela.
    expect((await dono.get(`/unidades/${B}/regras-agendamento`).expect(200)).body).toEqual(regrasB);
    const cal = (
      await dono.get(`/unidades/${B}/calendario?de=2027-12-01&ate=2027-12-31`).expect(200)
    ).body as { data: string; trabalha: boolean; motivo: string | null }[];
    expect(cal.map((c) => [c.data, c.trabalha, c.motivo])).toEqual([
      ['2027-12-25', false, 'Natal'],
      ['2027-12-31', true, 'Abre'],
    ]);
    expect(
      (await dono.get(`/unidades/${B}/calendario?de=2025-01-01&ate=2025-01-31`).expect(200)).body,
    ).toEqual([]);

    // Agora as regras.
    await dono
      .post(`/unidades/${B}/copiar-configuracoes`, { deUnidadeId: A, itens: ['regras'] })
      .expect(200);
    expect(
      ((await dono.get(`/unidades/${B}/regras-agendamento`).expect(200)).body as RegrasAgendamento)
        .antecedenciaMin,
    ).toBe(180);
  });

  it('recusa a mesma unidade, lista vazia e o gestor que não alcança a outra unidade', async () => {
    await dono
      .post(`/unidades/${a.unidadeA}/copiar-configuracoes`, {
        deUnidadeId: a.unidadeA,
        itens: ['regras'],
      })
      .expect(400);
    await dono
      .post(`/unidades/${a.unidadeB}/copiar-configuracoes`, {
        deUnidadeId: a.unidadeA,
        itens: [],
      })
      .expect(400);
    // O gestor é só da unidade A.
    await gestor
      .post(`/unidades/${a.unidadeA}/copiar-configuracoes`, {
        deUnidadeId: a.unidadeB,
        itens: ['regras'],
      })
      .expect(403);
  });
});
