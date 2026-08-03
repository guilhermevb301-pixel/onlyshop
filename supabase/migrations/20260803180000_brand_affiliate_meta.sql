-- =============================================================================
-- CRM Fase 1 — etiquetas + notas internas por afiliado (privadas da marca).
--
-- O roster do /time é DERIVADO de campaign_applications, então não há onde a
-- marca guardar "observações internas" e "etiquetas (VIP/Top/Novo)". Esta tabela
-- mapeia (marca, afiliado) -> tags + nota. É privada: só o dono da marca lê/escreve.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.brand_affiliate_meta (
  brand_id           uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  affiliate_user_id  uuid NOT NULL,
  tags               text[] NOT NULL DEFAULT '{}',
  notes              text,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (brand_id, affiliate_user_id)
);

ALTER TABLE public.brand_affiliate_meta ENABLE ROW LEVEL SECURITY;

-- Só o dono da marca enxerga/edita as observações internas dela.
DROP POLICY IF EXISTS "meta: brand owner all" ON public.brand_affiliate_meta;
CREATE POLICY "meta: brand owner all" ON public.brand_affiliate_meta
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.user_id = auth.uid()));
