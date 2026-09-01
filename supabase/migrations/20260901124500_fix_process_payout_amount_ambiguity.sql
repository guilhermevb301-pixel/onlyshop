-- Qualify ledger columns so PL/pgSQL never confuses them with the local
-- payout amount variable. The previous definition could fail at runtime with
-- SQLSTATE 42702 while calculating campaign/application payout caps.
CREATE OR REPLACE FUNCTION public.process_payout_atomic(
  _application_id uuid,
  _caller_id uuid,
  _phase text,
  _index integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  app record;
  amount numeric;
  payout_ref text;
  paid_campaign numeric;
  campaign_hold numeric;
  paid_application numeric;
  proof_count integer;
  inserted integer;
  referrer_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(_application_id::text));
  SELECT ca.*,c.campaign_kind,c.funded,c.auto_approve,c.pay_mode AS campaign_pay_mode,
         b.user_id AS brand_user_id
    INTO app
    FROM public.campaign_applications ca
    JOIN public.campaigns c ON c.id=ca.campaign_id
    JOIN public.brands b ON b.id=c.brand_id
   WHERE ca.id=_application_id
   FOR UPDATE OF ca;
  IF NOT FOUND THEN RETURN jsonb_build_object('result','not_found'); END IF;
  IF app.campaign_kind <> 'process' THEN RETURN jsonb_build_object('result','not_process'); END IF;
  IF app.funded IS DISTINCT FROM true THEN RETURN jsonb_build_object('result','not_funded'); END IF;
  IF app.campaign_pay_mode='split' THEN RETURN jsonb_build_object('result','split'); END IF;
  IF _caller_id IS DISTINCT FROM app.brand_user_id AND _caller_id IS DISTINCT FROM app.influencer_user_id THEN
    RETURN jsonb_build_object('result','forbidden');
  END IF;

  IF _phase='connection' THEN
    IF app.status IN ('applied','rejected') THEN RETURN jsonb_build_object('result','not_accepted'); END IF;
    amount := 20; payout_ref := 'connect-'||_application_id::text;
  ELSIF _phase='video' THEN
    IF _index NOT BETWEEN 1 AND 10 THEN RETURN jsonb_build_object('result','index'); END IF;
    proof_count := CASE WHEN jsonb_typeof(coalesce(app.proofs->'videos','null'::jsonb))='array'
      THEN jsonb_array_length(app.proofs->'videos') ELSE 0 END;
    IF proof_count < _index THEN RETURN jsonb_build_object('result','proof'); END IF;
    IF _caller_id=app.influencer_user_id AND _caller_id IS DISTINCT FROM app.brand_user_id
       AND app.auto_approve IS DISTINCT FROM true THEN RETURN jsonb_build_object('result','needs_brand'); END IF;
    amount := 2; payout_ref := 'video-'||_application_id::text||'-'||_index::text;
  ELSIF _phase='live' THEN
    IF _index NOT BETWEEN 1 AND 7 THEN RETURN jsonb_build_object('result','index'); END IF;
    proof_count := CASE WHEN jsonb_typeof(coalesce(app.proofs->'lives','null'::jsonb))='array'
      THEN jsonb_array_length(app.proofs->'lives') ELSE 0 END;
    IF proof_count < _index THEN RETURN jsonb_build_object('result','proof'); END IF;
    IF _caller_id=app.influencer_user_id AND _caller_id IS DISTINCT FROM app.brand_user_id
       AND app.auto_approve IS DISTINCT FROM true THEN RETURN jsonb_build_object('result','needs_brand'); END IF;
    amount := 10; payout_ref := 'live-'||_application_id::text||'-'||_index::text;
  ELSE
    RETURN jsonb_build_object('result','phase');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.platform_credits AS pc
     WHERE pc.provider_ref=payout_ref AND pc.kind='payout'
  ) THEN
    RETURN jsonb_build_object('result','already','amount',amount);
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(app.campaign_id::text));
  SELECT abs(coalesce(sum(pc.amount),0)) INTO campaign_hold
    FROM public.platform_credits AS pc
   WHERE pc.campaign_id=app.campaign_id AND pc.kind='campaign_hold';
  SELECT coalesce(sum(pc.amount),0) INTO paid_campaign
    FROM public.platform_credits AS pc
   WHERE pc.campaign_id=app.campaign_id AND pc.kind='payout';
  SELECT coalesce(sum(pc.amount),0) INTO paid_application
    FROM public.platform_credits AS pc
   WHERE pc.kind='payout' AND pc.provider_ref LIKE '%'||_application_id::text||'%';
  IF paid_campaign + amount > campaign_hold + 0.001 THEN RETURN jsonb_build_object('result','cap_campaign'); END IF;
  IF paid_application + amount > 110.001 THEN RETURN jsonb_build_object('result','cap_app'); END IF;

  INSERT INTO public.platform_credits
    (user_id,kind,amount,campaign_id,status,provider,provider_ref,created_at)
  VALUES (app.influencer_user_id,'payout',amount,app.campaign_id,'completed','mercadopago',payout_ref,now())
  ON CONFLICT (provider_ref,kind) WHERE provider_ref IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted=0 THEN RETURN jsonb_build_object('result','already','amount',amount); END IF;

  IF _phase='connection' THEN
    UPDATE public.campaign_applications SET connection_paid_at=coalesce(connection_paid_at,now()) WHERE id=_application_id;
    SELECT referred_by INTO referrer_id FROM public.profiles WHERE user_id=app.influencer_user_id;
    IF referrer_id IS NOT NULL THEN
      INSERT INTO public.referral_earnings
        (earner_user_id,source_user_id,amount,source_amount,kind,status,provider_ref)
      VALUES (referrer_id,app.influencer_user_id,1.25,25,'subnetwork','completed','connect-ref-'||_application_id::text)
      ON CONFLICT (provider_ref) WHERE provider_ref IS NOT NULL DO NOTHING;
    END IF;
  ELSIF _phase='video' THEN
    UPDATE public.campaign_applications SET videos_paid=greatest(videos_paid,_index) WHERE id=_application_id;
  ELSE
    UPDATE public.campaign_applications SET lives_paid=greatest(lives_paid,_index) WHERE id=_application_id;
  END IF;
  RETURN jsonb_build_object('result','ok','amount',amount);
END $fn$;

REVOKE ALL ON FUNCTION public.process_payout_atomic(uuid,uuid,text,integer) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.process_payout_atomic(uuid,uuid,text,integer) TO service_role;
