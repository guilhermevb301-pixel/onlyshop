-- =============================================================================
-- A campanha e OU escrow OU split. Nunca as duas.
--
-- Furo que isso fecha: a campanha so fica visivel pro afiliado com funded=true,
-- ou seja, TODA campanha com candidato ja foi paga por inteiro no modelo escrow.
-- Sem esta coluna, o botao "Pagar contratados" cobraria a marca uma SEGUNDA vez,
-- e o dinheiro do escrow ficaria preso (o payout passaria a ser recusado).
--
-- Com pay_mode no nivel da CAMPANHA:
--   escrow -> caixa proprio (fund-campaign + payout-process + approve-delivery)
--   split  -> pagamento direto por vaga (pay-affiliate). O caixa antigo recusa.
-- Toda campanha existente continua escrow (default), entao nada muda pra quem
-- ja esta rodando.
-- =============================================================================
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS pay_mode text NOT NULL DEFAULT 'escrow';

DO $$ BEGIN
  ALTER TABLE public.campaigns
    ADD CONSTRAINT campaigns_pay_mode_chk CHECK (pay_mode IN ('escrow', 'split'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
