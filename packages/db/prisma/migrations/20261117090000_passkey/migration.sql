-- Passkeys (pedido do dono em 15/11): entrar com a digital ou o rosto do celular, sem senha.
-- Só a chave pública fica guardada; o segredo nunca sai do aparelho.
-- CreateTable
CREATE TABLE "passkey" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "conta_id" UUID NOT NULL DEFAULT conta_atual(),
    "usuario_id" UUID NOT NULL,
    "credencial_id" TEXT NOT NULL,
    "chave_publica" BYTEA NOT NULL,
    "contador" INTEGER NOT NULL DEFAULT 0,
    "transportes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dispositivo" TEXT NOT NULL,
    "com_backup" BOOLEAN NOT NULL DEFAULT false,
    "aaguid" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usado_em" TIMESTAMPTZ(3),

    CONSTRAINT "passkey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "passkey_credencial_id_key" ON "passkey"("credencial_id");
CREATE INDEX "passkey_conta_id_idx" ON "passkey"("conta_id");
CREATE INDEX "passkey_usuario_id_idx" ON "passkey"("usuario_id");

-- AddForeignKey
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "conta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Escrito à mão ────────────────────────────────────────────────────────

SELECT habilitar_isolamento_conta('passkey');

-- Login com passkey: a API ainda não sabe a conta, só o id da credencial que o navegador mandou.
-- Ela declara o id na transação (app.passkey_credencial) e enxerga só essa linha; só leitura.
CREATE POLICY login_por_passkey ON passkey
  FOR SELECT
  USING (credencial_id = nullif(current_setting('app.passkey_credencial', true), ''));
