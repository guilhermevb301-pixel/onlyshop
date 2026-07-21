-- =============================================================================
-- O registro de dinheiro nao pode ser apagado por quem recebeu.
--
-- As FKs de split_payments eram ON DELETE CASCADE. O afiliado tem DELETE na
-- propria candidatura (policy FOR ALL) e a marca tem DELETE na propria campanha.
-- Entao dava pra apagar a candidatura DEPOIS de receber por split: o registro
-- do pagamento sumia junto, levando o UNIQUE(application_id) e a trilha de
-- auditoria. Ele se recandidatava e podia ser pago de novo.
--
-- Com RESTRICT, a candidatura/campanha nao pode ser apagada enquanto existir
-- pagamento ligado a ela. O dinheiro vira registro permanente.
-- =============================================================================
ALTER TABLE public.split_payments
  DROP CONSTRAINT IF EXISTS split_payments_application_id_fkey,
  DROP CONSTRAINT IF EXISTS split_payments_campaign_id_fkey;

ALTER TABLE public.split_payments
  ADD CONSTRAINT split_payments_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES public.campaign_applications(id) ON DELETE RESTRICT,
  ADD CONSTRAINT split_payments_campaign_id_fkey
    FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE RESTRICT;

-- Uma conta Mercado Pago pertence a UM usuario. Sem isso, varias identidades
-- apontariam pra mesma conta (farm de conexao) e um sequestro de vinculo nao
-- deixaria sinal de "ja vinculada em outro lugar".
CREATE UNIQUE INDEX IF NOT EXISTS affiliate_mp_accounts_mp_user_uidx
  ON public.affiliate_mp_accounts (mp_user_id);
