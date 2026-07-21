-- =============================================================================
-- SPLIT AUTOMÁTICO (Mercado Pago Marketplace)
--
-- Modelo novo: a marca paga POR AFILIADO APROVADO e o dinheiro cai DIRETO na
-- conta Mercado Pago do afiliado, já descontada a taxa da OnlyShop
-- (application_fee). Não passa pelo nosso caixa -> não existe saque manual.
--
-- RISCO NÚMERO 1 QUE ESTA MIGRATION FECHA: pagar duas vezes.
-- Se um pagamento por split também virasse saldo no ledger, o afiliado sacaria
-- via PIX um dinheiro que JÁ está na conta dele. Por isso:
--   1) campaign_applications.pay_mode marca a candidatura como 'split' ou 'ledger'.
--      O payout-process (caixa antigo) RECUSA qualquer candidatura 'split'.
--   2) o lançamento do split entra no ledger com kind='split_payout', que é
--      INFORMATIVO (aparece no extrato, NÃO soma no saldo sacável).
--   3) split_payments tem UNIQUE (application_id) -> a mesma vaga não é cobrada
--      duas vezes nem se o front repetir o clique.
-- =============================================================================

-- Como esta candidatura é paga. NULL/'ledger' = fluxo antigo (caixa + saque PIX).
ALTER TABLE public.campaign_applications
  ADD COLUMN IF NOT EXISTS pay_mode text NOT NULL DEFAULT 'ledger';

DO $$ BEGIN
  ALTER TABLE public.campaign_applications
    ADD CONSTRAINT campaign_applications_pay_mode_chk CHECK (pay_mode IN ('ledger', 'split'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Um registro por pagamento de vaga via split.
CREATE TABLE IF NOT EXISTS public.split_payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.campaign_applications(id) ON DELETE CASCADE,
  campaign_id    uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  brand_user_id  uuid NOT NULL,
  affiliate_user_id uuid NOT NULL,
  gross          numeric NOT NULL,          -- o que a marca paga (ex.: 134)
  fee            numeric NOT NULL,          -- taxa OnlyShop (application_fee, ex.: 24)
  net            numeric NOT NULL,          -- o que cai na conta do afiliado (ex.: 110)
  status         text NOT NULL DEFAULT 'pending',  -- pending|paid|failed|cancelled
  preference_id  text,
  mp_payment_id  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  paid_at        timestamptz
);

-- Blindagem contra cobrança dupla da mesma vaga.
CREATE UNIQUE INDEX IF NOT EXISTS split_payments_application_uidx
  ON public.split_payments (application_id);
CREATE INDEX IF NOT EXISTS split_payments_campaign_idx ON public.split_payments (campaign_id);
CREATE UNIQUE INDEX IF NOT EXISTS split_payments_mp_payment_uidx
  ON public.split_payments (mp_payment_id) WHERE mp_payment_id IS NOT NULL;

ALTER TABLE public.split_payments ENABLE ROW LEVEL SECURITY;

-- Leitura: só quem está no pagamento (marca ou afiliado). Escrita: só service_role.
DROP POLICY IF EXISTS "split: parties read" ON public.split_payments;
CREATE POLICY "split: parties read" ON public.split_payments
  FOR SELECT TO authenticated
  USING (auth.uid() = brand_user_id OR auth.uid() = affiliate_user_id);

REVOKE INSERT, UPDATE, DELETE ON public.split_payments FROM anon, authenticated;
