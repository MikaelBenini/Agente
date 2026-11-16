-- Quem respondeu o cliente (sugestão aprovada em 16/11/2026): o autor no painel ou a marca de que
-- a equipe respondeu pelo WhatsApp do celular, para Conversas mostrar quem e há quanto tempo.
ALTER TABLE "mensagem" ADD COLUMN "autor_id" UUID,
ADD COLUMN "pelo_celular" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "mensagem" ADD CONSTRAINT "mensagem_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
