-- Sitemap com os sites das barbearias (sugestão aprovada em 16/11/2026): os sites publicados
-- (/s/<site_slug>) das unidades que ligaram "Aparecer no Google". Como a das páginas de
-- agendamento: só o público, por cima do isolamento por conta.
CREATE FUNCTION sites_de_barbearia_no_google()
  RETURNS TABLE (site_slug text, publicado_em timestamptz)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
    SELECT u.site_slug, COALESCE(u.site_publicado_em, u.atualizado_em)
      FROM unidade u
     WHERE u.ativa AND u.aparecer_no_google AND u.site_slug IS NOT NULL
       AND u.site_publicado IS NOT NULL
     ORDER BY u.site_slug
  $$;
REVOKE ALL ON FUNCTION sites_de_barbearia_no_google() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sites_de_barbearia_no_google() TO pente_fino_aplicacao;
