-- DATA-13 (auditoria Augusto): arredonda coordenada de SAÍDA das RPCs de geo
-- (~1km) — para de vazar localização exata de creator/marca/território. distance_km
-- continua exato (coluna crua). Reversível. Front usa distance_km, não a coord.

CREATE OR REPLACE FUNCTION public.campaigns_near(_lat numeric, _lon numeric, _radius_km numeric DEFAULT 100, _limit integer DEFAULT 50)
 RETURNS TABLE(campaign_id uuid, brand_id uuid, brand_name text, title text, reward_amount numeric, reward_type text, slots integer, slots_filled integer, target_city text, target_state text, physical_item text, deadline_hours integer, distance_km numeric, brand_lat numeric, brand_lon numeric)
 LANGUAGE sql
 STABLE
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

CREATE OR REPLACE FUNCTION public.influencers_near(_lat numeric, _lon numeric, _radius_km numeric DEFAULT 100, _limit integer DEFAULT 50)
 RETURNS TABLE(user_id uuid, referral_code text, username text, display_name text, avatar_url text, city text, state text, niches text[], followers_count integer, latitude numeric, longitude numeric, distance_km numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    p.user_id,
    p.referral_code,
    p.username,
    p.display_name,
    p.avatar_url,
    p.city,
    p.state,
    p.niches,
    p.followers_count,
    round(p.latitude, 2),
    round(p.longitude, 2),
    public.haversine_km(_lat, _lon, p.latitude, p.longitude) AS distance_km
  FROM public.profiles p
  WHERE p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p.user_id
        AND ur.role IN ('affiliate','agency')
    )
    AND public.haversine_km(_lat, _lon, p.latitude, p.longitude) <= _radius_km
  ORDER BY distance_km ASC
  LIMIT _limit;
$function$;

CREATE OR REPLACE FUNCTION public.territories_near(_lat numeric, _lon numeric, _radius_km numeric DEFAULT 50, _scope text DEFAULT NULL::text, _limit integer DEFAULT 30)
 RETURNS TABLE(id uuid, scope text, name text, city text, state text, neighborhood text, score numeric, latitude double precision, longitude double precision, owner_user_id uuid, owner_username text, owner_display_name text, owner_avatar_url text, owner_level integer, distance_km numeric)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT t.id, t.scope, t.name, t.city, t.state, t.neighborhood, t.score,
         round(t.latitude::numeric, 2)::double precision, round(t.longitude::numeric, 2)::double precision, t.owner_user_id,
         p.username, p.display_name, p.avatar_url, p.level,
         CASE WHEN t.latitude IS NULL THEN NULL
              ELSE public.haversine_km(_lat, _lon, t.latitude::numeric, t.longitude::numeric) END AS distance_km
  FROM public.territories t
  LEFT JOIN public.profiles p ON p.user_id = t.owner_user_id
  WHERE (_scope IS NULL OR t.scope = _scope)
    AND (t.latitude IS NULL OR public.haversine_km(_lat, _lon, t.latitude::numeric, t.longitude::numeric) <= _radius_km)
  ORDER BY t.score DESC
  LIMIT _limit;
$function$;
