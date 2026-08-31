-- =============================================================================
-- DATA-01 (auditoria Augusto) — PASSO A (aditivo, não quebra nada).
--
-- Prepara o terreno pra fechar as colunas sensíveis de `profiles` (latitude,
-- longitude, street, referred_by, total_revenue, mp_connected), que hoje QUALQUER
-- um lê pela API. Antes de revogar, dois pré-requisitos:
--
-- 1) get_my_profile(): o app lia o PRÓPRIO perfil com select('*') — isso quebraria
--    com grant por coluna (o dono precisa ver o próprio dado). RPC SECURITY
--    DEFINER devolve a própria linha inteira, só pra quem está logado.
-- 2) As duas funções de Smart Match eram INVOKER e leem profiles.latitude /
--    total_revenue — quebrariam junto com o revoke. Viram SECURITY DEFINER
--    (com search_path fixo, que elas já tinham) e seguem funcionando igual.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT * FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$fn$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.match_affiliates_for_brand(_brand_id uuid, _limit integer DEFAULT 50)
 RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, city text, state text, niches text[], categories text[], followers_count integer, total_sales integer, total_revenue numeric, conversion_rate numeric, performance_score numeric, distance_km numeric, niche_overlap integer, match_score numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_b_lat numeric;
  v_b_lon numeric;
  v_b_niches text[];
  v_b_cats text[];
BEGIN
  SELECT br.latitude, br.longitude, COALESCE(br.niches,'{}'::text[]), COALESCE(br.target_categories,'{}'::text[])
    INTO v_b_lat, v_b_lon, v_b_niches, v_b_cats
  FROM public.brands br WHERE br.id = _brand_id;

  RETURN QUERY
  SELECT
    p.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.city,
    p.state,
    p.niches,
    p.categories,
    p.followers_count,
    p.total_sales,
    p.total_revenue,
    p.conversion_rate,
    p.performance_score,
    public.haversine_km(v_b_lat, v_b_lon, p.latitude, p.longitude) AS distance_km,
    cardinality(ARRAY(SELECT unnest(COALESCE(p.niches,'{}'::text[])) INTERSECT SELECT unnest(v_b_niches)))::int AS niche_overlap,
    (
      LEAST(40, cardinality(ARRAY(SELECT unnest(COALESCE(p.niches,'{}'::text[])) INTERSECT SELECT unnest(v_b_niches))) * 15)
      + LEAST(20, cardinality(ARRAY(SELECT unnest(COALESCE(p.categories,'{}'::text[])) INTERSECT SELECT unnest(v_b_cats))) * 10)
      + CASE
          WHEN public.haversine_km(v_b_lat, v_b_lon, p.latitude, p.longitude) IS NULL THEN 5
          WHEN public.haversine_km(v_b_lat, v_b_lon, p.latitude, p.longitude) < 50 THEN 25
          WHEN public.haversine_km(v_b_lat, v_b_lon, p.latitude, p.longitude) < 200 THEN 15
          WHEN public.haversine_km(v_b_lat, v_b_lon, p.latitude, p.longitude) < 1000 THEN 8
          ELSE 2
        END
      + LEAST(15, p.performance_score / 10.0)
    )::numeric AS match_score
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE ur.role IN ('affiliate','agency')
  ORDER BY match_score DESC NULLS LAST
  LIMIT _limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.match_brands_for_affiliate(_user_id uuid, _limit integer DEFAULT 50)
 RETURNS TABLE(brand_id uuid, name text, slug text, logo_url text, city text, state text, niches text[], verified boolean, distance_km numeric, niche_overlap integer, match_score numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_a_lat numeric;
  v_a_lon numeric;
  v_a_niches text[];
  v_a_cats text[];
BEGIN
  SELECT pr.latitude, pr.longitude, COALESCE(pr.niches,'{}'::text[]), COALESCE(pr.categories,'{}'::text[])
    INTO v_a_lat, v_a_lon, v_a_niches, v_a_cats
  FROM public.profiles pr WHERE pr.user_id = _user_id;

  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.slug,
    b.logo_url,
    b.city,
    b.state,
    b.niches,
    b.verified,
    public.haversine_km(v_a_lat, v_a_lon, b.latitude, b.longitude) AS distance_km,
    cardinality(ARRAY(SELECT unnest(COALESCE(b.niches,'{}'::text[])) INTERSECT SELECT unnest(v_a_niches)))::int AS niche_overlap,
    (
      LEAST(40, cardinality(ARRAY(SELECT unnest(COALESCE(b.niches,'{}'::text[])) INTERSECT SELECT unnest(v_a_niches))) * 15)
      + LEAST(20, cardinality(ARRAY(SELECT unnest(COALESCE(b.target_categories,'{}'::text[])) INTERSECT SELECT unnest(v_a_cats))) * 10)
      + CASE
          WHEN public.haversine_km(v_a_lat, v_a_lon, b.latitude, b.longitude) IS NULL THEN 5
          WHEN public.haversine_km(v_a_lat, v_a_lon, b.latitude, b.longitude) < 50 THEN 25
          WHEN public.haversine_km(v_a_lat, v_a_lon, b.latitude, b.longitude) < 200 THEN 15
          WHEN public.haversine_km(v_a_lat, v_a_lon, b.latitude, b.longitude) < 1000 THEN 8
          ELSE 2
        END
      + CASE WHEN b.verified THEN 15 ELSE 5 END
    )::numeric AS match_score
  FROM public.brands b
  WHERE b.status IN ('active','pending')
  ORDER BY match_score DESC NULLS LAST
  LIMIT _limit;
END;
$function$;
