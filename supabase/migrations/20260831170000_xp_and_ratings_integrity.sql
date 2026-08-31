-- =============================================================================
-- DATA-07 + DATA-06 (auditoria Augusto): gamificação e avaliações à prova de fraude.
--
-- XP: add_gamification_points recebia _user_id E _points DO CLIENTE — qualquer um
-- logado dava XP infinito pra si (ou pra outro). Agora, quando vem do navegador,
-- o servidor força o usuário (auth.uid()) e o valor (tabela de ações).
-- Escrita direta em user_levels/gamification_points também some (o front não usa).
--
-- RATINGS: dava pra forjar avaliação sem nunca ter trabalhado junto. Agora um
-- trigger exige: quem avalia é o próprio, não avalia a si mesmo, e existe uma
-- candidatura REAL (entregue/aprovada/paga) ligando as duas partes.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.add_gamification_points(_user_id uuid, _action text, _points integer, _metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _total INTEGER;
  _level TEXT;
  _current_week DATE;
  _current_month DATE;
BEGIN
  -- ANTI-FRAUDE (DATA-07): chamada pelo NAVEGADOR (auth.uid() não nulo) não escolhe
  -- pra quem vai o XP nem quanto vale — o servidor decide pela tabela de ações.
  -- service_role (auth.uid() nulo) segue livre: é a API que premia entrega aprovada.
  IF auth.uid() IS NOT NULL THEN
    _user_id := auth.uid();
    _points := CASE _action
      WHEN 'post' THEN 10  WHEN 'comment' THEN 5  WHEN 'like' THEN 2
      WHEN 'lesson_complete' THEN 20  WHEN 'help_member' THEN 15
      WHEN 'daily_login' THEN 5  WHEN 'streak_bonus' THEN 25
      WHEN 'course_complete' THEN 100  WHEN 'campaign_join' THEN 10
      WHEN 'video_generated' THEN 30  WHEN 'video_published' THEN 50
      ELSE 0 END;  -- premiações ligadas a dinheiro (first_sale/live_done/
                   -- campaign_approved) só pelo servidor
    IF _points = 0 THEN RETURN; END IF;
  END IF;
  -- Insert point record
  INSERT INTO public.gamification_points (user_id, action, points, metadata)
  VALUES (_user_id, _action, _points, _metadata);

  _current_week := date_trunc('week', now())::date;
  _current_month := date_trunc('month', now())::date;

  -- Upsert user level
  INSERT INTO public.user_levels (user_id, total_xp, weekly_xp, monthly_xp, week_start, month_start, updated_at)
  VALUES (_user_id, _points, _points, _points, _current_week, _current_month, now())
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = user_levels.total_xp + _points,
    weekly_xp = CASE WHEN user_levels.week_start = _current_week THEN user_levels.weekly_xp + _points ELSE _points END,
    monthly_xp = CASE WHEN user_levels.month_start = _current_month THEN user_levels.monthly_xp + _points ELSE _points END,
    week_start = _current_week,
    month_start = _current_month,
    updated_at = now();

  -- Calculate new level
  SELECT total_xp INTO _total FROM public.user_levels WHERE user_id = _user_id;
  
  _level := CASE
    WHEN _total >= 10000 THEN 'elite'
    WHEN _total >= 5000 THEN 'diamante'
    WHEN _total >= 2000 THEN 'ouro'
    WHEN _total >= 500 THEN 'prata'
    ELSE 'bronze'
  END;

  UPDATE public.user_levels SET level = _level WHERE user_id = _user_id;
END;
$function$;

REVOKE INSERT, UPDATE, DELETE ON public.user_levels        FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.gamification_points FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.guard_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;            -- servidor passa
  IF NEW.rater_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'você só avalia em seu próprio nome' USING ERRCODE='check_violation';
  END IF;
  IF NEW.rated_user_id = NEW.rater_user_id THEN
    RAISE EXCEPTION 'não dá pra avaliar a si mesmo' USING ERRCODE='check_violation';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.campaign_applications ca
    JOIN public.campaigns c ON c.id = ca.campaign_id
    JOIN public.brands b    ON b.id = c.brand_id
    WHERE ca.id = NEW.application_id
      AND ca.status IN ('delivered','approved','paid')
      AND ( (NEW.rater_user_id = ca.influencer_user_id AND NEW.rated_user_id = b.user_id)
         OR (NEW.rater_user_id = b.user_id AND NEW.rated_user_id = ca.influencer_user_id) )
  ) THEN
    RAISE EXCEPTION 'avaliação exige um trabalho concluído entre vocês' USING ERRCODE='check_violation';
  END IF;
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS guard_rating_trg ON public.ratings;
CREATE TRIGGER guard_rating_trg BEFORE INSERT OR UPDATE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.guard_rating();
