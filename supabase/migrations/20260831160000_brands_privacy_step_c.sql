-- =============================================================================
-- DATA-02 — PASSO C: fecha as colunas sensíveis de `brands`.
-- Antes qualquer um lia pela API: team_invite_code (dava pra ENTRAR no time de
-- qualquer marca), coordenada exata da loja, plano contratado e créditos.
-- Agora: grant só das colunas de vitrine. O dono vê tudo via get_my_brand().
-- Reversível: GRANT SELECT ON public.brands TO anon, authenticated.
-- =============================================================================
REVOKE SELECT ON public.brands FROM anon, authenticated;
GRANT SELECT (id, user_id, name, slug, description, logo_url, website, verified, status, created_at, updated_at, city, state, niches, target_categories, category, influence_radius_km, hires_count) ON public.brands TO anon, authenticated;
