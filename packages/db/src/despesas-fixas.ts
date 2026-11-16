// Despesas fixas no mês seguinte (pedido do dono em 11/11/2026). A rotina diária do worker lança no
// mês atual as despesas marcadas "Repetir todo mês" no mês anterior. A origem é única no banco:
// rodar de novo (ou alguém já ter copiado à mão) não duplica.
import {
  CATEGORIA_SALARIOS,
  descricaoSalario,
  mesAnteriorDe,
  vencimentoNoMesSeguinte,
} from '@pente-fino/shared';
import type { Prisma, PrismaClient } from './generated/prisma/client.js';
import { naConta } from './index.js';

const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const texto = (d: Date) => d.toISOString().slice(0, 10);

/** Lança as cópias que faltam no mês de `hoje` (AAAA-MM-DD). Devolve quantas lançou. */
export async function repetirDespesasDoMes(
  prisma: PrismaClient,
  contaId: string,
  hoje: string,
): Promise<number> {
  const mes = hoje.slice(0, 7);
  const anterior = mesAnteriorDe(mes);
  return naConta(prisma, contaId, async (tx) => {
    const origens = await tx.despesa.findMany({
      where: { competencia: dia(`${anterior}-01`), repetir: true, copia: null },
      orderBy: { criadoEm: 'asc' },
    });
    // Os salários do mês entram junto (pedido do dono em 16/11/2026).
    let lancadas = await garantirSalariosDoMes(tx, mes);
    for (const o of origens) {
      const r = await tx.despesa.createMany({
        data: [
          {
            unidadeId: o.unidadeId,
            categoriaId: o.categoriaId,
            descricao: o.descricao,
            valor: o.valor,
            competencia: dia(`${mes}-01`),
            vencimento: o.vencimento ? dia(vencimentoNoMesSeguinte(texto(o.vencimento))!) : null,
            repetir: true,
            origemId: o.id,
            // Salário de barbeiro que repete: leva o barbeiro, e o único (barbeiro, mês) segura
            // a cópia que já veio pela prévia das fixas.
            profissionalId: o.profissionalId,
          },
        ],
        // Corrida com a cópia manual: a origem única (e o salário único) segura, e aqui só pula.
        skipDuplicates: true,
      });
      lancadas += r.count;
    }
    return lancadas;
  });
}

/**
 * Salário dos barbeiros nas despesas fixas do mês (pedido do dono em 16/11/2026: "o salário não
 * aparece como fixo"). Cada barbeiro ativo com valor fixo em Equipe tem a despesa "Salário: nome"
 * no mês, a pagar, sem precisar copiar. Um por barbeiro e mês (único no banco); quem já lançou à
 * mão (categoria de salários com o nome dele) não ganha outro.
 * Com `profissionalId` (o valor mudou em Equipe): o salário do mês ainda não pago acompanha o
 * valor novo, e some se o valor virou zero. Devolve quantos lançou.
 */
export async function garantirSalariosDoMes(
  tx: Prisma.TransactionClient,
  mes: string,
  profissionalId?: string,
): Promise<number> {
  const competencia = dia(`${mes}-01`);
  const profissionais = await tx.profissional.findMany({
    where: profissionalId ? { id: profissionalId } : { custoFixoMensal: { gt: 0 } },
    include: { usuario: { select: { nome: true } } },
  });
  let categoriaId: string | null = null;
  let lancados = 0;
  for (const p of profissionais) {
    const noMes = p.ativo && (!p.dataSaida || p.dataSaida >= competencia);
    const existente = await tx.despesa.findFirst({ where: { profissionalId: p.id, competencia } });
    if (p.custoFixoMensal <= 0 || !noMes) {
      // Tirou o valor fixo (ou saiu): o salário do mês que ainda não foi pago sai junto.
      if (profissionalId && existente && !existente.pago)
        await tx.despesa.delete({ where: { id: existente.id } });
      continue;
    }
    if (existente) {
      if (profissionalId && !existente.pago && existente.valor !== p.custoFixoMensal)
        await tx.despesa.update({
          where: { id: existente.id },
          data: { valor: p.custoFixoMensal },
        });
      continue;
    }
    const nome = p.usuario.nome.trim();
    const aMao = await tx.despesa.findFirst({
      where: {
        competencia,
        unidadeId: p.unidadeId,
        profissionalId: null,
        categoria: { nome: CATEGORIA_SALARIOS },
        descricao: { contains: nome, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (aMao) continue;
    categoriaId ??=
      (await tx.categoriaDespesa.findFirst({ where: { nome: CATEGORIA_SALARIOS } }))?.id ??
      (await tx.categoriaDespesa.create({ data: { nome: CATEGORIA_SALARIOS, grupo: 'fixa' } })).id;
    const r = await tx.despesa.createMany({
      data: [
        {
          unidadeId: p.unidadeId,
          categoriaId,
          descricao: descricaoSalario(nome),
          valor: p.custoFixoMensal,
          competencia,
          profissionalId: p.id,
        },
      ],
      // Corrida com outra chamada: o único (barbeiro, mês) segura.
      skipDuplicates: true,
    });
    lancados += r.count;
  }
  return lancados;
}
