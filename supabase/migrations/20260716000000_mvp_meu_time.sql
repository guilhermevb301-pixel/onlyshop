-- ============================================================================
-- 20260716000000_mvp_meu_time.sql — FASE 2 "MEU TIME" (consolidada, aditiva, idempotente)
-- Une roster-metricas + recompensas-time + convite-time em UMA migration.
-- 100% ADITIVA. NAO toca pagamento: fund-campaign / mp-webhook / approve-delivery /
-- platform_credits / split 80/20 / computeSplit INTACTOS. Nenhum endpoint /api aqui.
--
-- O ROSTER (metricas) NAO depende de tabela nova — deriva de campaign_applications
-- (RLS "app: brand owner" ja existente). As tabelas abaixo sao membership, recompensas
-- e broadcast do time. Billing recorrente (R$/afiliado/mes) = PLACEHOLDER (coluna
-- monthly_fee_cents default 0), sem cobranca, sem MP, sem subscriptions.
--
-- CORRECOES DE REVIEW APLICADAS:
--  * convite-time (rlsSafe=false): REMOVIDA a policy self-INSERT permissiva por link.
--    Auto-vinculacao por link so via FUNCTION SECURITY DEFINER public.join_team(_code)
--    que valida posse do codigo server-side (brands e SELECT publico -> team_invite_code
--    NAO e segredo -> gate no client seria cosmetico, mesmo bug de brand_cannot_accept).
--  * UPDATE do afiliado em brand_affiliates ganha WITH CHECK travando status/source/
--    brand_id/monthly_fee_cents (impede reativar apos remocao / mexer em billing).
--  * recompensas-time: policy do afiliado exige status IN (accepted,delivered,approved,
--    paid) — candidatura 'applied'/'rejected' NAO da acesso. Reusa public.update_updated_at()
--    existente (NAO redefine set_updated_at).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- (0) LINK DE CONVITE DO TIME — codigo por marca (usado so no join server-side).
--     brands e SELECT USING(true): o codigo NAO e secreto por si; a seguranca do
--     join vem da FUNCTION join_team (SECURITY DEFINER), nao de esconder a coluna.
-- ----------------------------------------------------------------------------
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS team_invite_code text;
UPDATE public.brands
  SET team_invite_code = upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))
  WHERE team_invite_code IS NULL;
ALTER TABLE public.brands
  ALTER COLUMN team_invite_code SET DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
CREATE UNIQUE INDEX IF NOT EXISTS brands_team_invite_code_key
  ON public.brands(team_invite_code);

-- ----------------------------------------------------------------------------
-- (1) MEMBERSHIP persistente marca<->afiliado (roster duravel; base do billing futuro).
--     Complementa — nao substitui — o roster derivado de campaign_applications.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brand_affiliates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id          uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  affiliate_user_id uuid NOT NULL,
  status            text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','invited','removed')),
  source            text NOT NULL DEFAULT 'manual'
                      CHECK (source IN ('manual','invited','link','derived','imported_tiktok')),
  monthly_fee_cents integer NOT NULL DEFAULT 0,   -- PLACEHOLDER billing (nao cobra nada)
  note              text,
  added_at          timestamptz NOT NULL DEFAULT now(),
  removed_at        timestamptz,
  UNIQUE (brand_id, affiliate_user_id)
);
ALTER TABLE public.brand_affiliates ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS brand_affiliates_brand_idx     ON public.brand_affiliates(brand_id, status);
CREATE INDEX IF NOT EXISTS brand_affiliates_affiliate_idx ON public.brand_affiliates(affiliate_user_id, status);

-- SELECT: marca dona ve o SEU roster; afiliado ve os times que participa
DROP POLICY IF EXISTS "ba: brand owner or self select" ON public.brand_affiliates;
CREATE POLICY "ba: brand owner or self select" ON public.brand_affiliates FOR SELECT TO authenticated
  USING (
    affiliate_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_affiliates.brand_id AND b.user_id = auth.uid())
  );

-- INSERT: SO a marca dona adiciona membro (convite direto / quem ja candidatou).
-- NAO existe policy self-INSERT por link (fechado o vazamento cross-tenant).
-- Afiliado entra por link exclusivamente via FUNCTION join_team (secao 5).
DROP POLICY IF EXISTS "ba: self join via link" ON public.brand_affiliates;  -- garante remocao se ja existir
DROP POLICY IF EXISTS "ba: brand owner insert" ON public.brand_affiliates;
CREATE POLICY "ba: brand owner insert" ON public.brand_affiliates FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_affiliates.brand_id AND b.user_id = auth.uid()));

-- UPDATE marca dona: gerencia status/nota (ex.: remover)
DROP POLICY IF EXISTS "ba: brand owner update" ON public.brand_affiliates;
CREATE POLICY "ba: brand owner update" ON public.brand_affiliates FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_affiliates.brand_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_affiliates.brand_id AND b.user_id = auth.uid()));

-- UPDATE afiliado (sair do time): SO pode setar removed, NAO pode reativar nem
-- mexer em source/brand_id/monthly_fee_cents. Fecha escalada apos remocao.
DROP POLICY IF EXISTS "ba: self leave update" ON public.brand_affiliates;
CREATE POLICY "ba: self leave update" ON public.brand_affiliates FOR UPDATE TO authenticated
  USING (affiliate_user_id = auth.uid())
  WITH CHECK (affiliate_user_id = auth.uid() AND status = 'removed');

-- DELETE: so a marca dona
DROP POLICY IF EXISTS "ba: brand owner delete" ON public.brand_affiliates;
CREATE POLICY "ba: brand owner delete" ON public.brand_affiliates FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_affiliates.brand_id AND b.user_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- (2) RECOMPENSAS / DESAFIOS do time ("quem mais vender ganha R$X") — meta/gamificacao.
--     prize_amount NAO passa por MP nem pelo ledger; premio e acordo off-platform.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_rewards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id      uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  prize_amount  numeric NOT NULL DEFAULT 0,   -- R$ do premio (informativo; nunca payout automatico)
  criteria      text,                          -- livre: "quem mais vender em julho"
  metric        text NOT NULL DEFAULT 'deliveries'
                  CHECK (metric IN ('deliveries','approvals','sales')),
  goal          numeric,
  deadline      timestamptz,
  status        text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('draft','active','completed','cancelled')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_rewards ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS team_rewards_brand_idx  ON public.team_rewards(brand_id, status);
CREATE INDEX IF NOT EXISTS team_rewards_status_idx ON public.team_rewards(status);

-- MARCA: CRUD completo do SEU time (padrao brand-owner)
DROP POLICY IF EXISTS "team_rewards: brand owner" ON public.team_rewards;
CREATE POLICY "team_rewards: brand owner" ON public.team_rewards FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = team_rewards.brand_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = team_rewards.brand_id AND b.user_id = auth.uid()));

-- AFILIADO: SELECT-only das recompensas ATIVAS de marcas em cujas campanhas ele
-- EFETIVAMENTE trabalhou. status da candidatura restrito (nao basta 'applied'/'rejected').
-- OU ser membro ATIVO curado do time (brand_affiliates). Nunca ve draft/cancelled/completed.
DROP POLICY IF EXISTS "team_rewards: team affiliate read" ON public.team_rewards;
CREATE POLICY "team_rewards: team affiliate read" ON public.team_rewards FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND (
      EXISTS (
        SELECT 1 FROM public.campaign_applications ap
        JOIN public.campaigns c ON c.id = ap.campaign_id
        WHERE c.brand_id = team_rewards.brand_id
          AND ap.influencer_user_id = auth.uid()
          AND ap.status IN ('accepted','delivered','approved','paid')
      )
      OR EXISTS (
        SELECT 1 FROM public.brand_affiliates ba
        WHERE ba.brand_id = team_rewards.brand_id
          AND ba.affiliate_user_id = auth.uid()
          AND ba.status = 'active'
      )
    )
  );

-- updated_at automatico — REUSA a funcao existente public.update_updated_at() (NAO redefine)
DROP TRIGGER IF EXISTS trg_team_rewards_updated_at ON public.team_rewards;
CREATE TRIGGER trg_team_rewards_updated_at
  BEFORE UPDATE ON public.team_rewards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ----------------------------------------------------------------------------
-- (3) BROADCAST / ANUNCIO do time — historico marca -> time (so membro ativo le).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_announcements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id   uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  title      text,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_announcements ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS team_announcements_brand_idx ON public.team_announcements(brand_id, created_at DESC);

DROP POLICY IF EXISTS "ta: brand owner all" ON public.team_announcements;
CREATE POLICY "ta: brand owner all" ON public.team_announcements FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = team_announcements.brand_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = team_announcements.brand_id AND b.user_id = auth.uid()));

-- Leitura SO por membro ATIVO curado (brand_affiliates) — como so a marca insere em
-- brand_affiliates ou o join_team valida o codigo, nao ha entrada cross-tenant.
DROP POLICY IF EXISTS "ta: team member select" ON public.team_announcements;
CREATE POLICY "ta: team member select" ON public.team_announcements FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.brand_affiliates ba
    WHERE ba.brand_id = team_announcements.brand_id
      AND ba.affiliate_user_id = auth.uid()
      AND ba.status = 'active'
  ));

-- ----------------------------------------------------------------------------
-- (4) RESOLVER LINK DE CONVITE (display) — retorna so id/nome/logo pra tela /time/entrar/:code.
--     brands ja e publico, entao nao vaza nada novo; conveniencia de leitura.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_team_invite(_code text)
RETURNS TABLE (brand_id uuid, brand_name text, brand_logo text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.id, b.name, b.logo_url
  FROM public.brands b
  WHERE b.team_invite_code = upper(_code)
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_team_invite(text) TO authenticated;

-- ----------------------------------------------------------------------------
-- (5) ENTRAR NO TIME PELO LINK — unica via de auto-vinculacao do afiliado.
--     SECURITY DEFINER: exige POSSE do codigo (fecha o vazamento cross-tenant do
--     self-INSERT). Insere o proprio auth.uid() com source='link'. Idempotente via
--     UPSERT no UNIQUE(brand_id, affiliate_user_id). Nao permite marca inserir por aqui.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_team(_code text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _brand_id uuid;
  _uid uuid := auth.uid();
  _row_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT b.id INTO _brand_id
  FROM public.brands b
  WHERE b.team_invite_code = upper(_code)
  LIMIT 1;

  IF _brand_id IS NULL THEN
    RAISE EXCEPTION 'invalid team invite code';
  END IF;

  INSERT INTO public.brand_affiliates (brand_id, affiliate_user_id, status, source)
  VALUES (_brand_id, _uid, 'active', 'link')
  ON CONFLICT (brand_id, affiliate_user_id)
  DO UPDATE SET status = 'active', removed_at = NULL
  RETURNING id INTO _row_id;

  RETURN _row_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.join_team(text) TO authenticated;

-- ----------------------------------------------------------------------------
-- NOTA: Billing recorrente (R$/afiliado/mes) NAO e construido aqui — so a coluna
-- monthly_fee_cents (placeholder, default 0). Nenhuma subscription/MP criada ou tocada.
-- Roster de metricas do /time deriva 100% de campaign_applications; estas tabelas
-- sao membership/recompensa/broadcast — acesso no client via cast `as any` ate
-- regenerar integrations/supabase/types.ts (padrao ja usado com campaigns).
-- ----------------------------------------------------------------------------