CREATE OR REPLACE FUNCTION public.normalize_brand_website_domain(_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $fn$
DECLARE
  value text := lower(btrim(coalesce(_input, '')));
BEGIN
  IF value = '' THEN
    RETURN NULL;
  END IF;

  value := regexp_replace(value, '^https?://', '', 'i');
  value := regexp_replace(value, '^//', '');
  value := regexp_replace(value, '^www\.', '', 'i');
  value := split_part(value, '/', 1);
  value := split_part(value, '?', 1);
  value := split_part(value, '#', 1);
  value := regexp_replace(value, '\.$', '');

  RETURN nullif(value, '');
END;
$fn$;

CREATE OR REPLACE FUNCTION public.is_valid_brand_website_domain(_domain text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $fn$
DECLARE
  value text := lower(btrim(coalesce(_domain, '')));
  label text;
  labels text[];
  tld text;
BEGIN
  IF value = '' THEN
    RETURN true;
  END IF;

  IF value ~* '^https?://' OR value LIKE 'www.%' THEN
    RETURN false;
  END IF;

  IF value ~ '[/?:#@]' OR length(value) > 253 OR value LIKE '%.'
  THEN
    RETURN false;
  END IF;

  labels := string_to_array(value, '.');
  IF array_length(labels, 1) < 2 THEN
    RETURN false;
  END IF;

  FOREACH label IN ARRAY labels LOOP
    IF label !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$' THEN
      RETURN false;
    END IF;
  END LOOP;

  tld := labels[array_length(labels, 1)];
  IF tld !~ '^[a-z]{2,63}$' THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.normalize_brand_website_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  NEW.website := public.normalize_brand_website_domain(NEW.website);
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_normalize_brand_website_before_write ON public.brands;
CREATE TRIGGER trg_normalize_brand_website_before_write
BEFORE INSERT OR UPDATE OF website ON public.brands
FOR EACH ROW
EXECUTE FUNCTION public.normalize_brand_website_before_write();

ALTER TABLE public.brands
  DROP CONSTRAINT IF EXISTS brands_website_domain_only_chk;

UPDATE public.brands
SET website = public.normalize_brand_website_domain(website)
WHERE website IS NOT NULL;

ALTER TABLE public.brands
  ADD CONSTRAINT brands_website_domain_only_chk
  CHECK (public.is_valid_brand_website_domain(website));

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
  IF NOT public.is_valid_brand_website_domain(public.normalize_brand_website_domain(_website)) THEN
    RAISE EXCEPTION 'invalid brand website' USING ERRCODE='check_violation';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(actor::text));
  IF EXISTS (SELECT 1 FROM public.brands WHERE user_id=actor) THEN
    RAISE EXCEPTION 'brand already exists' USING ERRCODE='unique_violation';
  END IF;
  INSERT INTO public.brands(user_id,name,slug,description,logo_url,website,status,verified)
  VALUES (actor,trim(_name),_slug,left(_description,2000),_logo_url,public.normalize_brand_website_domain(_website),'active',false)
  RETURNING * INTO created;
  RETURN created;
END $fn$;

REVOKE ALL ON FUNCTION public.create_my_brand(text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_my_brand(text,text,text,text,text) TO authenticated;
