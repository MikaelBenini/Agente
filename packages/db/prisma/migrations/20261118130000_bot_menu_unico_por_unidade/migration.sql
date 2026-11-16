-- Menu do bot por unidade (16/11/2026): um rascunho e um publicado por conta E unidade; o padrão
-- da barbearia (unidade nula) conta como uma unidade só (NULLS NOT DISTINCT).
DROP INDEX "bot_menu_um_rascunho";
DROP INDEX "bot_menu_um_publicado";
CREATE UNIQUE INDEX "bot_menu_um_rascunho" ON "bot_menu"("conta_id", "unidade_id") NULLS NOT DISTINCT WHERE "status" = 'rascunho';
CREATE UNIQUE INDEX "bot_menu_um_publicado" ON "bot_menu"("conta_id", "unidade_id") NULLS NOT DISTINCT WHERE "status" = 'publicado';
