-- Plano Agenda, revenda: "Experimentar 7 dias" libera os recursos do Básico por uma semana, uma
-- vez por conta. Preenchida = já experimentou (vale até a data).
-- AlterTable
ALTER TABLE "conta" ADD COLUMN "experimenta_basico_ate" TIMESTAMPTZ(3);
