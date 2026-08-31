-- =============================================================================
-- DATA-02 (auditoria Augusto) — PASSO A da privacidade de `brands` (aditivo).
--
-- Hoje qualquer um lê pela API: team_invite_code (sequestro de convite de time!),
-- coordenada exata da loja, plano contratado e créditos de permuta.
--
-- Pré-requisitos antes de revogar:
-- 1) get_my_brand(): o app lia a própria marca com select('*') — o dono precisa
--    de invite/plano. RPC SECURITY DEFINER devolve a própria linha inteira.
-- 2) campaigns_near era INVOKER e lê brands.latitude (pra distância) — viraria
--    quebrado. Passa a SECURITY DEFINER (mantendo o arredondamento da saída).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_brand()
RETURNS SETOF public.brands
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT * FROM public.brands WHERE user_id = auth.uid() LIMIT 1;
$fn$;

REVOKE ALL ON FUNCTION public.get_my_brand() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_brand() TO authenticated;

CREATE OR REPLACE FUNCTION public.campaigns_near(_lat numeric, _lon numeric, _radius_km numeric DEFAULT 100, _limit integer DEFAULT 50)
 RETURNS TABLE(campaign_id uuid, brand_id uuid, brand_name text, title text, reward_amount numeric, reward_type text, slots integer, slots_filled integer, target_city text, target_state text, physical_item text, deadline_hours integer, distance_km numeric, brand_lat numeric, brand_lon numeric)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select c.id, c.brand_id, b.name, c.name, c.reward_amount, c.reward_type, c.slots,
         c.slots_filled, c.target_city, c.target_state, c.physical_item, c.deadline_hours,
         public.haversine_km(_lat, _lon, b.latitude, b.longitude) as distance_km,
         round(b.latitude, 2), round(b.longitude, 2)
  from public.campaigns c
  join public.brands b on b.id = c.brand_id
  where c.funded = true
    and c.status = 'active'
    and c.slots_filled < c.slots
    and b.latitude is not null and b.longitude is not null
    and public.haversine_km(_lat, _lon, b.latitude, b.longitude) <= _radius_km
  order by distance_km asc
  limit _limit;
$function$;
