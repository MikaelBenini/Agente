-- Salário dos barbeiros na cópia das fixas (decisão do dono em 16/11/2026): a despesa de salário
-- guarda o barbeiro, e o índice único impede dois salários do mesmo barbeiro no mesmo mês.
ALTER TABLE "despesa" ADD COLUMN "profissional_id" UUID;

CREATE UNIQUE INDEX "despesa_profissional_id_competencia_key" ON "despesa"("profissional_id", "competencia");

ALTER TABLE "despesa" ADD CONSTRAINT "despesa_profissional_id_fkey" FOREIGN KEY ("profissional_id") REFERENCES "profissional"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
