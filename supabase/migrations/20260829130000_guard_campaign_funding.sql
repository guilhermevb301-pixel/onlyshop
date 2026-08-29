-- =============================================================================
-- FIN-01 (auditoria Augusto): a marca não pode marcar a PRÓPRIA campanha como
-- paga (funded) sem pagar. Hoje o cliente faz update({funded:true}) direto — dá
-- pra forçar o caminho de "pagamento não abriu" e ganhar campanha de graça.
--
-- Trava por TRIGGER (RLS não vê o valor ANTIGO): só o servidor (service_role =
-- auth.uid() nulo, ex.: o webhook do Mercado Pago após pagamento real) pode virar
-- funded false→true. Authenticated não. INSERT segue livre (campanha nasce
-- funded=false no escrow; funded=true no split, definido no server). Reversível.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.guard_campaign_funding()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;         -- servidor/webhook passa
  IF NEW.funded IS DISTINCT FROM OLD.funded AND NEW.funded = true THEN
    RAISE EXCEPTION 'funding é confirmado pelo pagamento, não pelo cliente'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_campaign_funding_trg ON public.campaigns;
CREATE TRIGGER guard_campaign_funding_trg
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.guard_campaign_funding();
