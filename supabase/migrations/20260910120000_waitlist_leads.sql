BEGIN;
CREATE TABLE public.waitlist_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
  email text NOT NULL UNIQUE CHECK (email = lower(btrim(email)) AND char_length(email) <= 254 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  whatsapp text NOT NULL UNIQUE CHECK (whatsapp ~ '^55[1-9][0-9]([2-5][0-9]{7}|9[0-9]{8})$'),
  profile text NOT NULL CHECK (profile IN ('creator', 'company')),
  created_at timestamptz NOT NULL DEFAULT now(),
  consent_at timestamptz NOT NULL DEFAULT now(),
  consent_version text NOT NULL DEFAULT 'waitlist-v1'
);
CREATE INDEX waitlist_leads_created_idx ON public.waitlist_leads(created_at DESC, id);
CREATE INDEX waitlist_leads_profile_idx ON public.waitlist_leads(profile, created_at DESC);
ALTER TABLE public.waitlist_leads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.waitlist_leads FROM anon, authenticated;
GRANT SELECT ON public.waitlist_leads TO authenticated;
GRANT ALL ON public.waitlist_leads TO service_role;
CREATE POLICY "Only admins read waitlist leads" ON public.waitlist_leads FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Bounded storage: one counter per hashed IP, reused after the time window.
CREATE TABLE public.waitlist_rate_limits (
  ip_hash text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL
);
ALTER TABLE public.waitlist_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.waitlist_rate_limits FROM anon, authenticated;

CREATE FUNCTION public.submit_waitlist_lead(_name text, _email text, _whatsapp text, _profile text, _ip_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE n integer;
BEGIN
  IF _ip_hash IS NULL OR _ip_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid request'; END IF;
  INSERT INTO public.waitlist_rate_limits AS limits(ip_hash, window_start, attempts)
  VALUES (_ip_hash, now(), 1)
  ON CONFLICT (ip_hash) DO UPDATE SET
    attempts = CASE WHEN limits.window_start < now() - interval '1 hour' THEN 1 ELSE limits.attempts + 1 END,
    window_start = CASE WHEN limits.window_start < now() - interval '1 hour' THEN now() ELSE limits.window_start END
  RETURNING attempts INTO n;
  IF n > 10 THEN RETURN false; END IF;
  DELETE FROM public.waitlist_rate_limits WHERE window_start < now() - interval '2 days';
  -- A public submission never updates somebody else's existing contact.
  -- All conflicts get the same response so contacts cannot be enumerated.
  INSERT INTO public.waitlist_leads(name, email, whatsapp, profile)
  VALUES (btrim(_name), lower(btrim(_email)), _whatsapp, _profile)
  ON CONFLICT DO NOTHING;
  RETURN true;
END $fn$;
REVOKE ALL ON FUNCTION public.submit_waitlist_lead(text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_waitlist_lead(text,text,text,text,text) TO service_role;
COMMIT;
