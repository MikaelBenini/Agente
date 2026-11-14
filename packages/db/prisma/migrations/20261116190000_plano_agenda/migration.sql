-- Plano Agenda (pedido do dono em 13/11): o plano de entrada. E as Automações contratadas à
-- parte no Agenda e no Básico (decisão do dono em 14/11): mais R$ 10 por mês.
ALTER TYPE "plano" ADD VALUE IF NOT EXISTS 'agenda' BEFORE 'basico';

-- AlterTable
ALTER TABLE "conta" ADD COLUMN "automacoes_contratadas" BOOLEAN NOT NULL DEFAULT false;

-- A administração muda o plano: devolve também as Automações contratadas (para o valor no
-- Asaas) e, do Pro em diante, elas deixam de ser cobradas à parte (já vêm no plano).
CREATE OR REPLACE FUNCTION plataforma_mudar_plano(p_conta uuid, p_plano plano, p_ciclo ciclo_cobranca)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
DECLARE
  antes jsonb;
BEGIN
  PERFORM set_config('app.conta_id', p_conta::text, true);
  SELECT jsonb_build_object('plano', plano, 'ciclo', ciclo, 'asaasAssinaturaId', asaas_assinatura_id,
         'unidades', (SELECT count(*) FROM unidade WHERE conta_id = p_conta AND ativa),
         'automacoes', automacoes_contratadas AND p_plano::text IN ('agenda', 'basico'))
    INTO antes FROM conta WHERE id = p_conta;
  IF antes IS NULL THEN RAISE EXCEPTION 'conta_inexistente'; END IF;
  UPDATE conta SET plano = p_plano, ciclo = p_ciclo, atualizado_em = now(),
         precos_desde = (now() AT TIME ZONE 'America/Sao_Paulo')::date,
         automacoes_contratadas = automacoes_contratadas AND p_plano::text IN ('agenda', 'basico')
   WHERE id = p_conta;
  RETURN antes;
END
$$;
