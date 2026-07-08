-- ============================================================================
-- MVP 2.0 — "O MAPA DA INFLUÊNCIA LOCAL" — fundação (aditiva, sem perda de dado)
--
-- Novos conceitos (spec + áudios 08/07):
--  - 3 perfis: Influenciador (affiliate), Embaixador (ambassador), Empresa (brand)
--  - Motor de crescimento: link de indicação + rede (33% 1ª compra + 5% recorrente)
--  - Permuta: campanha por permuta + pacotes escalonados (mín. R$300)
--  - Avaliação mútua, entrega multi-plataforma, aprovação automática 24h
--  - Territórios (dono de rua/bairro/cidade) — base do mapa vivo
--
-- IMPORTANTE: o ADD VALUE do enum roda em transação PRÓPRIA, antes das policies
-- que usam 'ambassador'. Aplicado via Management API em 3 chamadas separadas.
-- ============================================================================

-- (1) papel embaixador
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'ambassador';

-- (2) PERFIS: indicação, rede, rua, XP/nível
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid;         -- quem trouxe (rede)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS street text;              -- rua representada
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;
UPDATE public.profiles SET referral_code = upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)) WHERE referral_code IS NULL;
ALTER TABLE public.profiles ALTER COLUMN referral_code SET DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key ON public.profiles(referral_code);

-- EMPRESAS: créditos de permuta, categoria, área de influência
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS permuta_credits integer NOT NULL DEFAULT 0;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS influence_radius_km numeric NOT NULL DEFAULT 0;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS hires_count integer NOT NULL DEFAULT 0;

-- CAMPANHAS: permuta (reward_type já é text → aceita 'permuta'), briefing, hashtags
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS briefing text;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS hashtags text[];

-- ENTREGA: prova multi-plataforma + aprovação automática 24h
ALTER TABLE public.campaign_applications ADD COLUMN IF NOT EXISTS product_received_at timestamptz;
ALTER TABLE public.campaign_applications ADD COLUMN IF NOT EXISTS posted_at timestamptz;
ALTER TABLE public.campaign_applications ADD COLUMN IF NOT EXISTS auto_approve_at timestamptz;
ALTER TABLE public.campaign_applications ADD COLUMN IF NOT EXISTS proofs jsonb NOT NULL DEFAULT '[]'::jsonb; -- [{platform,url,reach}]

-- CARTEIRA DE REDE (indicação)
CREATE TABLE IF NOT EXISTS public.referral_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  earner_user_id uuid NOT NULL, source_user_id uuid, amount numeric NOT NULL,
  kind text NOT NULL,                    -- 'first_purchase'(33%) | 'recurring'(5%) | 'subnetwork'
  source_amount numeric, status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own referral earnings" ON public.referral_earnings;
CREATE POLICY "own referral earnings" ON public.referral_earnings FOR SELECT TO authenticated USING (earner_user_id = auth.uid());
CREATE INDEX IF NOT EXISTS referral_earnings_earner_idx ON public.referral_earnings(earner_user_id);

-- PACOTES DE PERMUTA
CREATE TABLE IF NOT EXISTS public.permuta_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid, buyer_user_id uuid NOT NULL, quantity integer NOT NULL,
  unit_price numeric NOT NULL, total numeric NOT NULL, status text NOT NULL DEFAULT 'pending',
  provider_ref text, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.permuta_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own permuta packages" ON public.permuta_packages;
CREATE POLICY "own permuta packages" ON public.permuta_packages FOR SELECT TO authenticated USING (buyer_user_id = auth.uid());

-- AVALIAÇÃO MÚTUA
CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid, rater_user_id uuid NOT NULL, rated_user_id uuid NOT NULL,
  stars integer NOT NULL CHECK (stars BETWEEN 1 AND 5), comment text,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(application_id, rater_user_id));
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ratings viewable" ON public.ratings;
CREATE POLICY "ratings viewable" ON public.ratings FOR SELECT USING (true);
DROP POLICY IF EXISTS "rate as self" ON public.ratings;
CREATE POLICY "rate as self" ON public.ratings FOR INSERT TO authenticated WITH CHECK (rater_user_id = auth.uid());

-- TERRITÓRIOS (dono de rua/bairro/cidade — base do mapa vivo)
CREATE TABLE IF NOT EXISTS public.territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL, name text NOT NULL, city text, state text,
  owner_user_id uuid, score numeric NOT NULL DEFAULT 0,
  latitude double precision, longitude double precision,
  updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(scope, name, city, state));
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "territories viewable" ON public.territories;
CREATE POLICY "territories viewable" ON public.territories FOR SELECT USING (true);

-- (3) RLS: usuário pode escolher o papel embaixador (além de affiliate/brand)
DROP POLICY IF EXISTS "Users can set own role" ON public.user_roles;
CREATE POLICY "Users can set own role" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role IN ('affiliate','brand','ambassador'));
DROP POLICY IF EXISTS "Users can change own role" ON public.user_roles;
CREATE POLICY "Users can change own role" ON public.user_roles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND role IN ('affiliate','brand','ambassador'));
