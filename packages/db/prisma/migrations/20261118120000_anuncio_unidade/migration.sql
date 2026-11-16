-- Mensagens de anúncio próprias da unidade (sugestão aprovada em 16/11/2026): nulo = as da conta.
ALTER TABLE "unidade" ADD COLUMN "fluxo_anuncio" JSONB;
