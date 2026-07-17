-- Fix da auditoria (furo #2): CAP atômico. O read-then-write do endpoint deixava
-- 2 requests paralelos (refs diferentes) passarem o CAP e estourarem o hold. Esta
-- RPC serializa por campanha (advisory lock) e checa hold + CAP por candidatura (110)
-- ANTES de inserir, tudo numa transação. O endpoint passa a chamá-la em vez do INSERT.
CREATE OR REPLACE FUNCTION public.process_payout(
  _app_id uuid, _campaign_id uuid, _user_id uuid, _ref text, _amount numeric, _cap_app numeric DEFAULT 110
)
RETURNS text  -- 'ok' | 'already' | 'cap_campaign' | 'cap_app'
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _hold numeric; _paid_camp numeric; _paid_app numeric;
BEGIN
  -- serializa os payouts DESTA campanha (fecha a corrida entre refs distintos)
  PERFORM pg_advisory_xact_lock(hashtext(_campaign_id::text));
  IF EXISTS (SELECT 1 FROM public.platform_credits WHERE provider_ref = _ref AND kind = 'payout') THEN
    RETURN 'already';
  END IF;
  SELECT abs(coalesce(sum(amount),0)) INTO _hold  FROM public.platform_credits WHERE campaign_id=_campaign_id AND kind='campaign_hold';
  SELECT coalesce(sum(amount),0)      INTO _paid_camp FROM public.platform_credits WHERE campaign_id=_campaign_id AND kind='payout';
  IF _paid_camp + _amount > _hold + 0.001 THEN RETURN 'cap_campaign'; END IF;
  -- CAP por candidatura: soma dos payouts desta application (o app_id aparece em todos
  -- os refs dela: connect-{app} / video-{app}-{n} / live-{app}-{d}). Teto 110/vaga.
  SELECT coalesce(sum(amount),0) INTO _paid_app FROM public.platform_credits
    WHERE kind='payout' AND provider_ref LIKE '%' || _app_id::text || '%';
  IF _paid_app + _amount > _cap_app + 0.001 THEN RETURN 'cap_app'; END IF;
  INSERT INTO public.platform_credits (user_id, kind, amount, campaign_id, status, provider, provider_ref, created_at)
    VALUES (_user_id, 'payout', _amount, _campaign_id, 'completed', 'mercadopago', _ref, now());
  RETURN 'ok';
END $$;
REVOKE ALL ON FUNCTION public.process_payout(uuid,uuid,uuid,text,numeric,numeric) FROM public, anon, authenticated;
