-- =============================================================================
-- DATA-01 — PASSO C: fecha as colunas sensíveis de `profiles`.
--
-- Antes: anon/authenticated tinham SELECT na TABELA inteira (37 colunas), ou seja,
-- qualquer um lia pela API a coordenada exata (14 dos 16 perfis reais!), endereço,
-- receita, quem indicou e o estado do Mercado Pago de QUALQUER usuário.
--
-- Agora: grant por COLUNA, só a vitrine. O dono continua vendo tudo de si via
-- get_my_profile() (passo A) e o Smart Match segue funcionando (SECURITY DEFINER).
-- Escrita não muda: o usuário continua salvando a própria localização normalmente.
-- Reversível: basta GRANT SELECT ON public.profiles TO anon, authenticated.
-- =============================================================================
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, user_id, username, display_name, avatar_url, bio, website, created_at, updated_at, city, state, niches, categories, followers_count, total_sales, conversion_rate, performance_score, gender, referral_code, xp, level, instagram_username, tiktok_username, youtube_username, whatsapp, intro_video_url, reach_estimate, avg_views, whatsapp_business, video_gallery, tiktok_url) ON public.profiles TO anon, authenticated;
