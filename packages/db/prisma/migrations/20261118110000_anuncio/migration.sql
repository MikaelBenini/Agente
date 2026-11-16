-- Mensagens automáticas de quem vem de anúncio (pedido do dono em 16/11/2026): a configuração do
-- fluxo na conta e a marca "veio de anúncio" na conversa do número.
ALTER TABLE "conta" ADD COLUMN "fluxo_anuncio" JSONB;

ALTER TABLE "bot_sessao" ADD COLUMN "anuncio_em" TIMESTAMPTZ(3),
ADD COLUMN "anuncio_titulo" TEXT;
