-- =============================================================================
-- CRM Fase 2 — pipeline (stage) + base do plano de gestão (billing).
-- =============================================================================

-- PIPELINE: etapa manual do afiliado no funil da marca. Reusa brand_affiliate_meta
-- (já privado da marca). NULL = deriva do status automaticamente na UI.
ALTER TABLE public.brand_affiliate_meta
  ADD COLUMN IF NOT EXISTS stage text;

-- PLANO DE GESTÃO (modelo novo do Biel): a marca assina pra gerir a própria base.
-- Aqui fica só o ESTADO do plano — a cobrança recorrente real (MP) é um passo
-- separado, que depende dos preços definidos. plan_status='none' = sem plano.
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS plan_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS plan_selected_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.brands ADD CONSTRAINT brands_plan_status_chk
    CHECK (plan_status IN ('none', 'trial', 'active', 'past_due', 'cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
