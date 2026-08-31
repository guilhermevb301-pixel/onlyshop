CREATE TABLE IF NOT EXISTS public.api_usage_daily (
  user_id uuid NOT NULL,
  operation text NOT NULL,
  usage_day date NOT NULL DEFAULT current_date,
  usage_count integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, operation, usage_day)
);

ALTER TABLE public.api_usage_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_usage_daily FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_my_api_usage(_operation text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  actor uuid := auth.uid();
  daily_limit integer;
  claimed integer;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;
  daily_limit := CASE _operation
    WHEN 'ai_copilot' THEN 30
    WHEN 'video_script' THEN 20
    WHEN 'video_clip' THEN 6
    WHEN 'video_merge' THEN 6
    WHEN 'influencer_image' THEN 3
    WHEN 'tiktok_trends' THEN 20
    ELSE 0
  END;
  IF daily_limit=0 THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(actor::text||':'||_operation||':'||current_date::text));
  INSERT INTO public.api_usage_daily(user_id,operation,usage_day,usage_count)
  VALUES (actor,_operation,current_date,1)
  ON CONFLICT (user_id,operation,usage_day) DO UPDATE
    SET usage_count=api_usage_daily.usage_count+1,updated_at=now()
    WHERE api_usage_daily.usage_count < daily_limit
  RETURNING usage_count INTO claimed;
  RETURN claimed IS NOT NULL;
END $fn$;

REVOKE ALL ON FUNCTION public.claim_my_api_usage(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_my_api_usage(text) TO authenticated;
