-- Menu do bot por unidade, com o padrão da barbearia (decisão do dono em 16/11/2026): sem
-- unidade = o padrão; a unidade que personalizou tem as próprias versões (rascunho, publicada,
-- arquivadas). As mensagens já aceitavam unidade (modelo_mensagem.unidade_id).
ALTER TABLE "bot_menu" ADD COLUMN "unidade_id" UUID;

CREATE INDEX "bot_menu_unidade_id_status_idx" ON "bot_menu"("unidade_id", "status");

ALTER TABLE "bot_menu" ADD CONSTRAINT "bot_menu_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
