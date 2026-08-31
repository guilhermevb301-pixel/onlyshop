-- Execute after migrations with psql -v ON_ERROR_STOP=1. Everything rolls back.
BEGIN;

DO $test$
DECLARE
  brand_user uuid := gen_random_uuid();
  creator_user uuid := gen_random_uuid();
  brand_id uuid := gen_random_uuid();
  campaign_id uuid := gen_random_uuid();
  application_id uuid := gen_random_uuid();
  funding_id uuid := gen_random_uuid();
  result text;
  payload jsonb;
  payout_count integer;
BEGIN
  INSERT INTO public.brands(id,user_id,name,slug,status)
  VALUES (brand_id,brand_user,'Launch Test','launch-test-'||brand_id,'active');
  INSERT INTO public.campaigns(
    id,brand_id,name,reward_type,reward_amount,slots,platform_fee_pct,total_budget,
    funded,pay_mode,campaign_kind,phases,status
  ) VALUES (
    campaign_id,brand_id,'Campanha segura','per_video',100,1,20,120,
    false,'escrow','standard','{}','active'
  );
  INSERT INTO public.campaign_fundings(id,campaign_id,brand_user_id,expected_amount,idempotency_key)
  VALUES (funding_id,campaign_id,brand_user,120,'funding-test-1');

  SELECT public.confirm_campaign_funding(funding_id,'mp-test-1',1) INTO result;
  IF result <> 'amount_mismatch' THEN RAISE EXCEPTION 'expected amount_mismatch, got %',result; END IF;
  SELECT public.confirm_campaign_funding(funding_id,'mp-test-1',120) INTO result;
  IF result <> 'ok' THEN RAISE EXCEPTION 'expected funding ok, got %',result; END IF;
  SELECT public.confirm_campaign_funding(funding_id,'mp-test-1',120) INTO result;
  IF result <> 'already' THEN RAISE EXCEPTION 'expected funding already, got %',result; END IF;

  INSERT INTO public.campaign_applications(id,campaign_id,influencer_user_id,status,delivery_url)
  VALUES (application_id,campaign_id,creator_user,'delivered','https://example.com/proof');
  SELECT public.approve_delivery_atomic(application_id,brand_user) INTO payload;
  IF payload->>'result' <> 'ok' THEN RAISE EXCEPTION 'expected approve ok, got %',payload; END IF;
  SELECT public.approve_delivery_atomic(application_id,brand_user) INTO payload;
  IF payload->>'result' <> 'already' THEN RAISE EXCEPTION 'expected approve already, got %',payload; END IF;
  SELECT count(*) INTO payout_count FROM public.platform_credits
   WHERE provider_ref='approve-'||application_id::text AND kind='payout';
  IF payout_count <> 1 THEN RAISE EXCEPTION 'expected one payout, got %',payout_count; END IF;

  SELECT public.request_withdrawal_atomic(creator_user,60,'email','v1.ciphertext','request-1') INTO payload;
  IF payload->>'result' <> 'ok' THEN RAISE EXCEPTION 'expected withdraw ok, got %',payload; END IF;
  SELECT public.request_withdrawal_atomic(creator_user,60,'email','v1.ciphertext','request-1') INTO payload;
  IF payload->>'result' <> 'already' THEN RAISE EXCEPTION 'expected withdraw already, got %',payload; END IF;
  SELECT public.request_withdrawal_atomic(creator_user,60,'email','v1.ciphertext','request-2') INTO payload;
  IF payload->>'result' <> 'insufficient' THEN RAISE EXCEPTION 'expected insufficient, got %',payload; END IF;
  IF EXISTS (SELECT 1 FROM public.platform_credits WHERE provider_ref LIKE '%v1.ciphertext%') THEN
    RAISE EXCEPTION 'ciphertext leaked into ledger';
  END IF;
END $test$;

ROLLBACK;
