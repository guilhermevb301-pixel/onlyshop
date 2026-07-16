-- 20260716200000_mvp_media_kit_vitrine.sql
-- Consolida as features SEM PAGAMENTO (A + B + C). Aditivo, idempotente, ZERO toque em RLS/ledger.
-- Não inclui nada de D (auto_approve / unique index) — pagamento vai em migration separada e sequenciada.

BEGIN;

-- ============================================================
-- FEATURE A — bloco de ALCANCE auto-declarado (vitrine)
-- 3 colunas de vitrine em profiles. Espelha padrão de 20260715000000.
-- RLS herdada (profiles: SELECT USING(true) público; UPDATE eq user_id do dono).
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reach_estimate    integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avg_views         integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_business text;

COMMENT ON COLUMN public.profiles.reach_estimate   IS 'Alcance auto-declarado: quantas pessoas o creator realmente atinge (contatos, grupos, offline). Não é seguidores.';
COMMENT ON COLUMN public.profiles.avg_views        IS 'Média auto-declarada de visualizações por post.';
COMMENT ON COLUMN public.profiles.whatsapp_business IS 'WhatsApp Business (só dígitos, vira wa.me). Distinto de whatsapp pessoal.';

-- ============================================================
-- FEATURE B — galeria de vídeos no media-kit (vitrine)
-- intro_video_url continua sendo o "vídeo principal" (compat); video_gallery são os extras.
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS video_gallery text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.profiles.video_gallery IS
  'Media-kit: URLs extras de vídeos (YouTube/Vimeo/mp4) exibidos no /i/CODIGO. Auto-declarado, editável pelo dono via updateProfile. RLS herda de profiles.';

-- ============================================================
-- FEATURE C — RPC influencers_near (LEITURA pura de vitrine)
-- Espelha territories_near (forma) + public_creator_portfolio (segurança).
-- profiles.latitude/longitude são NUMERIC (migration 20260505212439) => haversine_km SEM cast.
-- 'Ativo' = role affiliate/agency + lat/lon não-nulos (não há coluna de presença hoje).
-- EXISTS (não JOIN) pra 1 linha por profile (user_roles pode ter affiliate+agency).
-- Retorna SÓ campos de vitrine (sem email/telefone/split). referral_code é o elo pro /i/:code.
-- ============================================================
CREATE OR REPLACE FUNCTION public.influencers_near(
  _lat numeric, _lon numeric, _radius_km numeric DEFAULT 100, _limit int DEFAULT 50
)
RETURNS TABLE (
  user_id         uuid,
  referral_code   text,
  username        text,
  display_name    text,
  avatar_url      text,
  city            text,
  state           text,
  niches          text[],
  followers_count integer,
  latitude        numeric,
  longitude       numeric,
  distance_km     numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
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
    p.latitude,
    p.longitude,
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
$$;

REVOKE ALL ON FUNCTION public.influencers_near(numeric, numeric, numeric, int) FROM public;
GRANT EXECUTE ON FUNCTION public.influencers_near(numeric, numeric, numeric, int) TO anon, authenticated;

COMMIT;