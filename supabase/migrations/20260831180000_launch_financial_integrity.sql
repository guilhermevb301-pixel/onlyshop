-- Launch hardening: contratos financeiros imutáveis e mutações monetárias atômicas.

CREATE TABLE IF NOT EXISTS public.campaign_fundings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE RESTRICT,
  brand_user_id uuid NOT NULL,
  expected_amount numeric(14,2) NOT NULL CHECK (expected_amount > 0),
  provider text NOT NULL DEFAULT 'mercadopago',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','cancelled','review')),
  idempotency_key text NOT NULL,
  preference_id text,
  checkout_url text,
  provider_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  UNIQUE(brand_user_id, idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS campaign_fundings_preference_uidx
  ON public.campaign_fundings(preference_id) WHERE preference_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS campaign_fundings_payment_uidx
  ON public.campaign_fundings(provider_payment_id) WHERE provider_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS campaign_fundings_campaign_idx
  ON public.campaign_fundings(campaign_id, created_at DESC);

ALTER TABLE public.campaign_fundings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fundings: brand owner reads" ON public.campaign_fundings;
CREATE POLICY "fundings: brand owner reads" ON public.campaign_fundings
  FOR SELECT TO authenticated USING (brand_user_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.campaign_fundings FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount >= 50),
  pix_key_type text NOT NULL CHECK (pix_key_type IN ('cpf','cnpj','email','phone','random')),
  pix_key_ciphertext text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','cancelled')),
  idempotency_key text NOT NULL,
  provider_payment_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE(user_id, idempotency_key)
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "withdrawals: own read" ON public.withdrawal_requests;
CREATE POLICY "withdrawals: own read" ON public.withdrawal_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.withdrawal_requests FROM anon, authenticated;

-- O cliente legado ainda consegue inserir campanha, mas o banco ignora qualquer
-- campo financeiro forjado. O endpoint novo usa service_role e grava o mesmo
-- contrato canônico, permitindo deploy sem janela de quebra entre DB e frontend.
CREATE OR REPLACE FUNCTION public.guard_campaign_financial_contract()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  actor uuid := auth.uid();
  canonical_phases jsonb := '{"connection":{"brand":25,"affiliate":20},"video":{"amount":2,"max":10},"live":{"amount":10,"max":7}}'::jsonb;
BEGIN
  IF actor IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF length(trim(coalesce(NEW.name, ''))) NOT BETWEEN 2 AND 120 THEN
      RAISE EXCEPTION 'nome da campanha deve ter entre 2 e 120 caracteres' USING ERRCODE='check_violation';
    END IF;
    IF NEW.slots NOT BETWEEN 1 AND 100 THEN
      RAISE EXCEPTION 'slots deve estar entre 1 e 100' USING ERRCODE='check_violation';
    END IF;

    NEW.platform_fee_pct := 20;
    NEW.pay_mode := 'escrow';
    NEW.funded := false;
    NEW.status := 'active';
    NEW.slots_filled := 0;

    IF NEW.campaign_kind = 'process' THEN
      NEW.reward_amount := 0;
      NEW.reward_type := 'per_video';
      NEW.phases := canonical_phases;
      NEW.total_budget := round((NEW.slots * 134)::numeric, 2);
    ELSIF NEW.reward_type = 'permuta' THEN
      NEW.campaign_kind := 'standard';
      NEW.reward_amount := 0;
      NEW.phases := '{}'::jsonb;
      NEW.total_budget := round((NEW.slots * 25)::numeric, 2);
    ELSE
      NEW.campaign_kind := 'standard';
      NEW.phases := '{}'::jsonb;
      IF NEW.reward_amount < 10 OR NEW.reward_amount > 1000000 THEN
        RAISE EXCEPTION 'reward_amount fora do intervalo permitido' USING ERRCODE='check_violation';
      END IF;
      NEW.total_budget := round((NEW.slots * NEW.reward_amount * 1.20)::numeric, 2);
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.brand_id IS DISTINCT FROM OLD.brand_id
     OR NEW.reward_type IS DISTINCT FROM OLD.reward_type
     OR NEW.reward_amount IS DISTINCT FROM OLD.reward_amount
     OR NEW.slots IS DISTINCT FROM OLD.slots
     OR NEW.platform_fee_pct IS DISTINCT FROM OLD.platform_fee_pct
     OR NEW.total_budget IS DISTINCT FROM OLD.total_budget
     OR NEW.funded IS DISTINCT FROM OLD.funded
     OR NEW.pay_mode IS DISTINCT FROM OLD.pay_mode
     OR NEW.campaign_kind IS DISTINCT FROM OLD.campaign_kind
     OR NEW.phases IS DISTINCT FROM OLD.phases THEN
    RAISE EXCEPTION 'campos financeiros da campanha são imutáveis para o cliente'
      USING ERRCODE='check_violation';
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS guard_campaign_financial_contract_trg ON public.campaigns;
CREATE TRIGGER guard_campaign_financial_contract_trg
  BEFORE INSERT OR UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.guard_campaign_financial_contract();

DO $$ BEGIN
  ALTER TABLE public.campaigns
    ADD CONSTRAINT campaigns_launch_slots_chk CHECK (slots BETWEEN 1 AND 100) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.campaigns
    ADD CONSTRAINT campaigns_launch_fee_chk CHECK (platform_fee_pct = 20) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.campaigns
    ADD CONSTRAINT campaigns_launch_total_chk CHECK (total_budget > 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.confirm_campaign_funding(
  _funding_id uuid,
  _payment_id text,
  _paid_amount numeric
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  funding public.campaign_fundings%ROWTYPE;
  campaign_total numeric;
BEGIN
  IF nullif(trim(_payment_id), '') IS NULL OR _paid_amount <= 0 THEN RETURN 'invalid'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(_funding_id::text));
  SELECT * INTO funding FROM public.campaign_fundings WHERE id = _funding_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF funding.status = 'paid' THEN
    RETURN CASE WHEN funding.provider_payment_id = _payment_id THEN 'already' ELSE 'conflict' END;
  END IF;
  IF funding.status <> 'pending' THEN RETURN 'invalid_status'; END IF;

  SELECT total_budget INTO campaign_total
    FROM public.campaigns c
    JOIN public.brands b ON b.id = c.brand_id
   WHERE c.id = funding.campaign_id AND b.user_id = funding.brand_user_id
   FOR UPDATE OF c;
  IF campaign_total IS NULL THEN RETURN 'campaign_mismatch'; END IF;
  IF abs(campaign_total - funding.expected_amount) > 0.001
     OR abs(_paid_amount - funding.expected_amount) > 0.001 THEN
    RETURN 'amount_mismatch';
  END IF;

  UPDATE public.campaign_fundings
     SET status='paid', provider_payment_id=_payment_id, paid_at=now()
   WHERE id=_funding_id;
  UPDATE public.campaigns SET funded=true, status='active' WHERE id=funding.campaign_id;

  INSERT INTO public.platform_credits
    (user_id,kind,amount,campaign_id,status,provider,provider_ref,created_at)
  VALUES
    (funding.brand_user_id,'topup',funding.expected_amount,funding.campaign_id,'completed','mercadopago',_payment_id,now()),
    (funding.brand_user_id,'campaign_hold',-funding.expected_amount,funding.campaign_id,'completed','mercadopago',_payment_id,now())
  ON CONFLICT (provider_ref,kind) WHERE provider_ref IS NOT NULL DO NOTHING;
  RETURN 'ok';
EXCEPTION WHEN unique_violation THEN
  RETURN 'payment_reused';
END $fn$;

CREATE OR REPLACE FUNCTION public.approve_delivery_atomic(
  _application_id uuid,
  _caller_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  app record;
  payout_ref text := 'approve-' || _application_id::text;
  fee_amount numeric;
  proof_ok boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(_application_id::text));
  SELECT ca.*, c.reward_amount, c.reward_type, c.campaign_kind, c.funded, c.auto_approve,
         c.pay_mode AS campaign_pay_mode, b.user_id AS brand_user_id
    INTO app
    FROM public.campaign_applications ca
    JOIN public.campaigns c ON c.id=ca.campaign_id
    JOIN public.brands b ON b.id=c.brand_id
   WHERE ca.id=_application_id
   FOR UPDATE OF ca;
  IF NOT FOUND THEN RETURN jsonb_build_object('result','not_found'); END IF;
  IF app.status IN ('approved','paid') THEN RETURN jsonb_build_object('result','already'); END IF;

  proof_ok := nullif(trim(coalesce(app.delivery_url,'')), '') IS NOT NULL
    OR CASE jsonb_typeof(coalesce(app.proofs,'null'::jsonb))
         WHEN 'object' THEN jsonb_typeof(app.proofs->'links')='array'
              AND jsonb_array_length(app.proofs->'links') > 0
         WHEN 'array' THEN jsonb_array_length(app.proofs) > 0
         ELSE false
       END;

  IF _caller_id IS DISTINCT FROM app.brand_user_id
     AND NOT (app.auto_approve=true AND _caller_id=app.influencer_user_id AND proof_ok) THEN
    RETURN jsonb_build_object('result','forbidden');
  END IF;
  IF app.status <> 'delivered' THEN RETURN jsonb_build_object('result','not_delivered'); END IF;
  IF app.campaign_pay_mode='split' THEN RETURN jsonb_build_object('result','split'); END IF;
  IF app.funded IS DISTINCT FROM true THEN RETURN jsonb_build_object('result','not_funded'); END IF;
  IF app.campaign_kind='process' THEN RETURN jsonb_build_object('result','process'); END IF;

  IF app.reward_amount > 0 THEN
    INSERT INTO public.platform_credits
      (user_id,kind,amount,campaign_id,status,provider,provider_ref,created_at)
    VALUES
      (app.influencer_user_id,'payout',app.reward_amount,app.campaign_id,'completed','mercadopago',payout_ref,now())
    ON CONFLICT (provider_ref,kind) WHERE provider_ref IS NOT NULL DO NOTHING;
    fee_amount := round((app.reward_amount * 0.20)::numeric,2);
  ELSE
    fee_amount := 25;
  END IF;

  INSERT INTO public.platform_credits
    (user_id,kind,amount,campaign_id,status,provider,provider_ref,created_at)
  VALUES
    (app.brand_user_id,'platform_fee',fee_amount,app.campaign_id,'completed','mercadopago',payout_ref,now())
  ON CONFLICT (provider_ref,kind) WHERE provider_ref IS NOT NULL DO NOTHING;

  UPDATE public.campaign_applications SET status='approved',updated_at=now()
   WHERE id=_application_id;
  RETURN jsonb_build_object(
    'result','ok',
    'influencer_share',app.reward_amount,
    'influencer_user_id',app.influencer_user_id,
    'campaign_id',app.campaign_id
  );
END $fn$;

CREATE OR REPLACE FUNCTION public.confirm_split_payment_atomic(
  _split_id uuid,
  _payment_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  split public.split_payments%ROWTYPE;
BEGIN
  IF nullif(trim(_payment_id),'') IS NULL THEN RETURN jsonb_build_object('result','invalid'); END IF;
  PERFORM pg_advisory_xact_lock(hashtext(_split_id::text));
  SELECT * INTO split FROM public.split_payments WHERE id=_split_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('result','not_found'); END IF;
  IF split.status='paid' THEN
    RETURN jsonb_build_object('result',CASE WHEN split.mp_payment_id=_payment_id THEN 'already' ELSE 'conflict' END);
  END IF;
  IF split.status <> 'pending' THEN RETURN jsonb_build_object('result','invalid_status'); END IF;

  UPDATE public.split_payments
     SET status='paid',mp_payment_id=_payment_id,paid_at=now()
   WHERE id=_split_id;
  UPDATE public.campaign_applications SET pay_mode='split',updated_at=now()
   WHERE id=split.application_id;
  INSERT INTO public.platform_credits
    (user_id,kind,amount,campaign_id,status,provider,provider_ref,created_at)
  VALUES
    (split.affiliate_user_id,'split_payout',split.net,split.campaign_id,'completed','mercadopago',_payment_id,now()),
    (split.brand_user_id,'platform_fee',split.fee,split.campaign_id,'completed','mercadopago',_payment_id,now())
  ON CONFLICT (provider_ref,kind) WHERE provider_ref IS NOT NULL DO NOTHING;
  RETURN jsonb_build_object('result','ok','net',split.net);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('result','payment_reused');
END $fn$;

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

  IF EXISTS (SELECT 1 FROM public.platform_credits WHERE provider_ref=payout_ref AND kind='payout') THEN
    RETURN jsonb_build_object('result','already','amount',amount);
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(app.campaign_id::text));
  SELECT abs(coalesce(sum(amount),0)) INTO campaign_hold FROM public.platform_credits
   WHERE campaign_id=app.campaign_id AND kind='campaign_hold';
  SELECT coalesce(sum(amount),0) INTO paid_campaign FROM public.platform_credits
   WHERE campaign_id=app.campaign_id AND kind='payout';
  SELECT coalesce(sum(amount),0) INTO paid_application FROM public.platform_credits
   WHERE kind='payout' AND provider_ref LIKE '%'||_application_id::text||'%';
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

CREATE OR REPLACE FUNCTION public.request_withdrawal_atomic(
  _user_id uuid,
  _amount numeric,
  _pix_key_type text,
  _pix_key_ciphertext text,
  _idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  balance numeric;
  request_id uuid;
BEGIN
  IF _amount < 50 OR _pix_key_type NOT IN ('cpf','cnpj','email','phone','random')
     OR nullif(_pix_key_ciphertext,'') IS NULL OR nullif(_idempotency_key,'') IS NULL THEN
    RETURN jsonb_build_object('result','invalid');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(_user_id::text));
  SELECT id INTO request_id FROM public.withdrawal_requests
   WHERE user_id=_user_id AND idempotency_key=_idempotency_key;
  IF request_id IS NOT NULL THEN
    RETURN jsonb_build_object('result','already','request_id',request_id);
  END IF;

  SELECT round(coalesce(sum(amount),0),2) INTO balance
    FROM public.platform_credits
   WHERE user_id=_user_id
     AND kind NOT IN ('platform_fee','split_payout')
     AND status <> 'failed';
  IF _amount > balance THEN
    RETURN jsonb_build_object('result','insufficient','balance',balance);
  END IF;

  INSERT INTO public.withdrawal_requests
    (user_id,amount,pix_key_type,pix_key_ciphertext,idempotency_key)
  VALUES (_user_id,_amount,_pix_key_type,_pix_key_ciphertext,_idempotency_key)
  RETURNING id INTO request_id;
  INSERT INTO public.platform_credits
    (user_id,kind,amount,status,provider,provider_ref,created_at)
  VALUES
    (_user_id,'withdrawal',-_amount,'pending','mercadopago','withdrawal:'||request_id::text,now());
  RETURN jsonb_build_object('result','ok','request_id',request_id);
END $fn$;

-- Cadastro consistente mesmo com confirmação de email: username e indicação são
-- consumidos no trigger, sem depender de uma sessão ainda ausente no navegador.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  requested_username text := nullif(trim(NEW.raw_user_meta_data->>'username'),'');
  requested_referral text := nullif(trim(NEW.raw_user_meta_data->>'referral_code'),'');
  referrer_id uuid;
BEGIN
  IF requested_referral IS NOT NULL THEN
    SELECT user_id INTO referrer_id FROM public.profiles
     WHERE profiles.referral_code=requested_referral AND user_id<>NEW.id LIMIT 1;
  END IF;
  BEGIN
    INSERT INTO public.profiles(user_id,username,referred_by)
    VALUES (NEW.id,left(requested_username,50),referrer_id);
  EXCEPTION WHEN unique_violation THEN
    INSERT INTO public.profiles(user_id,referred_by) VALUES (NEW.id,referrer_id);
  END;
  INSERT INTO public.user_roles(user_id,role) VALUES (NEW.id,'viewer');
  BEGIN
    INSERT INTO public.activity_events(actor_user_id,type) VALUES (NEW.id,'new_signup');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END $fn$;

-- O onboarding pode escolher exatamente um papel comum uma única vez. Escrita
-- direta em user_roles é proibida para impedir autoelevação e múltiplos papéis.
CREATE OR REPLACE FUNCTION public.set_my_role(_role text)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  actor uuid := auth.uid();
  chosen public.app_role;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF _role NOT IN ('affiliate','brand','ambassador') THEN
    RAISE EXCEPTION 'role not allowed' USING ERRCODE='check_violation';
  END IF;
  chosen := _role::public.app_role;
  PERFORM pg_advisory_xact_lock(hashtext(actor::text));
  IF EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id=actor AND role NOT IN ('viewer',chosen)
  ) THEN
    RAISE EXCEPTION 'role already selected' USING ERRCODE='check_violation';
  END IF;
  DELETE FROM public.user_roles WHERE user_id=actor AND role='viewer';
  INSERT INTO public.user_roles(user_id,role) VALUES (actor,chosen)
  ON CONFLICT (user_id,role) DO NOTHING;
  RETURN chosen;
END $fn$;

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.set_my_role(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_role(text) TO authenticated;

-- Mass-assignment: usuários editam somente campos de perfil declarados. Métricas,
-- receita, referral, identidade e timestamps permanecem sob autoridade do banco.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (
  username, display_name, avatar_url, bio, website, city, state, latitude,
  longitude, niches, categories, gender, instagram_username, tiktok_username,
  youtube_username, whatsapp, intro_video_url, reach_estimate, avg_views,
  whatsapp_business, video_gallery, tiktok_url
) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.create_my_brand(
  _name text,
  _slug text,
  _description text DEFAULT NULL,
  _logo_url text DEFAULT NULL,
  _website text DEFAULT NULL
)
RETURNS public.brands
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  actor uuid := auth.uid();
  created public.brands%ROWTYPE;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=actor AND role='brand') THEN
    RAISE EXCEPTION 'brand role required' USING ERRCODE='insufficient_privilege';
  END IF;
  IF length(trim(coalesce(_name,''))) NOT BETWEEN 2 AND 120
     OR _slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     OR length(_slug) > 80 THEN
    RAISE EXCEPTION 'invalid brand data' USING ERRCODE='check_violation';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(actor::text));
  IF EXISTS (SELECT 1 FROM public.brands WHERE user_id=actor) THEN
    RAISE EXCEPTION 'brand already exists' USING ERRCODE='unique_violation';
  END IF;
  INSERT INTO public.brands(user_id,name,slug,description,logo_url,website,status,verified)
  VALUES (actor,trim(_name),_slug,left(_description,2000),_logo_url,_website,'active',false)
  RETURNING * INTO created;
  RETURN created;
END $fn$;

CREATE OR REPLACE FUNCTION public.select_my_brand_trial(_tier text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  IF _tier NOT IN ('inicio','starter','pro','scale') THEN
    RAISE EXCEPTION 'invalid plan' USING ERRCODE='check_violation';
  END IF;
  UPDATE public.brands
     SET plan_tier=_tier,
         plan_status='trial',
         plan_selected_at=coalesce(plan_selected_at,now())
   WHERE user_id=actor AND plan_status IN ('none','trial');
  RETURN FOUND;
END $fn$;

REVOKE INSERT, DELETE, UPDATE ON public.brands FROM anon, authenticated;
GRANT UPDATE (
  name, slug, description, logo_url, website, city, state, latitude, longitude,
  niches, target_categories, category, influence_radius_km
) ON public.brands TO authenticated;
REVOKE ALL ON FUNCTION public.create_my_brand(text,text,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.select_my_brand_trial(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_my_brand(text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.select_my_brand_trial(text) TO authenticated;

REVOKE ALL ON FUNCTION public.confirm_campaign_funding(uuid,text,numeric) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.approve_delivery_atomic(uuid,uuid) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.request_withdrawal_atomic(uuid,numeric,text,text,text) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.confirm_split_payment_atomic(uuid,text) FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.process_payout_atomic(uuid,uuid,text,integer) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_campaign_funding(uuid,text,numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_delivery_atomic(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.request_withdrawal_atomic(uuid,numeric,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_split_payment_atomic(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_payout_atomic(uuid,uuid,text,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_payout(uuid,uuid,uuid,text,numeric,numeric) TO service_role;
