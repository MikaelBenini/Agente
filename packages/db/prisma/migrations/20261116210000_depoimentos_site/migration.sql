-- Depoimentos da página de vendas (pedido do dono em 14/11): perfil do Instagram, nome, texto,
-- data e a foto guardada aqui (o endereço de imagem do Instagram expira). Tabela só da
-- administração: a aplicação das barbearias não enxerga.
-- CreateTable
CREATE TABLE "depoimento_site" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "instagram" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "quem" TEXT NOT NULL DEFAULT '',
    "texto" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "foto" BYTEA,
    "foto_tipo" TEXT,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "depoimento_site_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "depoimento_site_ativo_data_idx" ON "depoimento_site"("ativo", "data");

REVOKE ALL ON depoimento_site FROM pente_fino_aplicacao;
GRANT SELECT, INSERT, UPDATE, DELETE ON depoimento_site TO pente_fino_plataforma;
