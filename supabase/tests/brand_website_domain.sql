DO $$
BEGIN
  IF public.normalize_brand_website_domain('https://www.empresa.com.br/produtos?utm=1') <> 'empresa.com.br' THEN
    RAISE EXCEPTION 'expected full URL to normalize to empresa.com.br';
  END IF;

  IF public.normalize_brand_website_domain(' WWW.Meusite.COM ') <> 'meusite.com' THEN
    RAISE EXCEPTION 'expected www prefix and case to be normalized';
  END IF;

  IF NOT public.is_valid_brand_website_domain('empresa.com.br') THEN
    RAISE EXCEPTION 'expected empresa.com.br to be valid';
  END IF;

  IF public.is_valid_brand_website_domain('https://empresa.com.br') THEN
    RAISE EXCEPTION 'expected protocol to be invalid after storage validation';
  END IF;

  IF public.is_valid_brand_website_domain('www.empresa.com.br') THEN
    RAISE EXCEPTION 'expected www prefix to be invalid after storage validation';
  END IF;

  IF public.is_valid_brand_website_domain('empresa') THEN
    RAISE EXCEPTION 'expected domain without TLD to be invalid';
  END IF;
END $$;
