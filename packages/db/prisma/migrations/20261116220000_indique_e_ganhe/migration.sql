-- Indique e ganhe (regras do dono em 14/11): qualquer pessoa indica; 20% de cada mensalidade
-- paga pela indicada nos 12 primeiros meses dela, liberada 30 dias depois do pagamento; quem é
-- cliente pode trocar por 1 mês grátis por indicada que pagar. Tabelas só da administração; o
-- gatilho na fatura cria a comissão nos dois caminhos de pagamento (Asaas e registro manual).

-- AlterTable
ALTER TABLE "conta" ADD COLUMN "indicado_por" TEXT;

-- CreateTable
CREATE TABLE "indicador" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpf" TEXT,
    "chave_pix" TEXT,
    "codigo" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "conta_id" UUID,
    "recebe" TEXT NOT NULL DEFAULT 'pix',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "indicador_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "indicador_recebe_check" CHECK ("recebe" IN ('pix', 'meses'))
);

-- CreateTable
CREATE TABLE "comissao_indicacao" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "indicador_id" UUID NOT NULL,
    "conta_id" UUID NOT NULL,
    "fatura_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,
    "libera_em" TIMESTAMPTZ(3) NOT NULL,
    "paga_em" TIMESTAMPTZ(3),
    "cancelada_em" TIMESTAMPTZ(3),
    "aplicada_em" TIMESTAMPTZ(3),
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comissao_indicacao_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "comissao_indicacao_tipo_check" CHECK ("tipo" IN ('pix', 'mes'))
);

-- CreateIndex
CREATE UNIQUE INDEX "indicador_email_key" ON "indicador"("email");
CREATE UNIQUE INDEX "indicador_codigo_key" ON "indicador"("codigo");
CREATE UNIQUE INDEX "indicador_token_hash_key" ON "indicador"("token_hash");
CREATE UNIQUE INDEX "indicador_conta_id_key" ON "indicador"("conta_id");
CREATE UNIQUE INDEX "comissao_indicacao_fatura_id_key" ON "comissao_indicacao"("fatura_id");
CREATE INDEX "comissao_indicacao_indicador_id_idx" ON "comissao_indicacao"("indicador_id");

-- AddForeignKey
ALTER TABLE "comissao_indicacao" ADD CONSTRAINT "comissao_indicacao_indicador_id_fkey" FOREIGN KEY ("indicador_id") REFERENCES "indicador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

REVOKE ALL ON indicador, comissao_indicacao FROM pente_fino_aplicacao;
GRANT SELECT, INSERT, UPDATE ON indicador, comissao_indicacao TO pente_fino_plataforma;

-- A fatura ficou paga: cria a comissão de quem indicou (uma por fatura). Estornada (cancelada)
-- antes de pagar a comissão: a comissão é cancelada. Roda como dono da função: vale para o
-- pagamento pelo Asaas (usuário da aplicação) e para o registro manual (administração).
CREATE FUNCTION comissao_da_fatura() RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
DECLARE
  v_codigo text;
  v_indicador indicador%ROWTYPE;
  v_primeiro timestamptz;
BEGIN
  PERFORM set_config('app.conta_id', NEW.conta_id::text, true);
  IF NEW.status = 'cancelada' AND OLD IS NOT NULL AND OLD.status = 'paga' THEN
    UPDATE comissao_indicacao SET cancelada_em = now()
     WHERE fatura_id = NEW.id AND paga_em IS NULL AND aplicada_em IS NULL AND cancelada_em IS NULL;
    RETURN NEW;
  END IF;
  IF NEW.status <> 'paga' OR NEW.paga_em IS NULL OR (OLD IS NOT NULL AND OLD.status = 'paga') THEN
    RETURN NEW;
  END IF;
  SELECT indicado_por INTO v_codigo FROM conta WHERE id = NEW.conta_id;
  IF v_codigo IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_indicador FROM indicador WHERE codigo = v_codigo AND ativo;
  IF NOT FOUND OR v_indicador.conta_id = NEW.conta_id THEN RETURN NEW; END IF;
  SELECT min(paga_em) INTO v_primeiro FROM fatura_assinatura
   WHERE conta_id = NEW.conta_id AND status = 'paga' AND paga_em IS NOT NULL;
  v_primeiro := least(coalesce(v_primeiro, NEW.paga_em), NEW.paga_em);
  IF v_indicador.recebe = 'meses' AND v_indicador.conta_id IS NOT NULL THEN
    -- Cliente que troca por meses: 1 mês grátis por indicada, no primeiro pagamento dela.
    IF NOT EXISTS (SELECT 1 FROM comissao_indicacao
                    WHERE indicador_id = v_indicador.id AND conta_id = NEW.conta_id) THEN
      INSERT INTO comissao_indicacao (indicador_id, conta_id, fatura_id, tipo, valor, libera_em)
      VALUES (v_indicador.id, NEW.conta_id, NEW.id, 'mes', 0, NEW.paga_em + interval '30 days')
      ON CONFLICT (fatura_id) DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.paga_em >= v_primeiro + interval '12 months' THEN RETURN NEW; END IF;
  INSERT INTO comissao_indicacao (indicador_id, conta_id, fatura_id, tipo, valor, libera_em)
  VALUES (v_indicador.id, NEW.conta_id, NEW.id, 'pix', round(NEW.valor * 0.2)::int,
          NEW.paga_em + interval '30 days')
  ON CONFLICT (fatura_id) DO NOTHING;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION comissao_da_fatura() FROM PUBLIC;

CREATE TRIGGER fatura_comissao_indicacao
  AFTER INSERT OR UPDATE OF status, paga_em ON fatura_assinatura
  FOR EACH ROW EXECUTE FUNCTION comissao_da_fatura();

-- Painel do indicador: quantas barbearias entraram pelo link (em teste e pagantes), sem expor
-- os dados delas para a administração além do número.
CREATE FUNCTION indicadas_do_codigo(p_codigo text)
  RETURNS TABLE (em_teste integer, pagantes integer)
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
    SELECT count(*) FILTER (WHERE status = 'teste')::int,
           count(*) FILTER (WHERE status = 'ativa')::int
      FROM conta WHERE indicado_por = p_codigo;
$$;
REVOKE ALL ON FUNCTION indicadas_do_codigo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION indicadas_do_codigo(text) TO pente_fino_plataforma;
