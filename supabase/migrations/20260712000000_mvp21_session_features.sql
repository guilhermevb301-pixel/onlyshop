-- ============================================================================
-- MVP 2.1 — features da sessão (avaliação, links sociais, chat RLS, território,
-- feed de atividade). Idempotente. Espelha o que foi aplicado via Management API
-- pra o repo NÃO divergir do banco (replay de migrations não ressuscita bugs).
-- ============================================================================

-- (C) avaliação guiada
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS criteria jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS ratings_rated_user_idx ON public.ratings(rated_user_id);

-- (B) links sociais do afiliado
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_username text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tiktok_username text;

-- (E) chat — corrige recursão de RLS (42P17)
-- supabase/migrations/20260712000000_chat_rls_hardening.sql
-- Corrige recursão de RLS em conversation_participants (bug latente 42P17) e
-- blinda o SELECT de chat via função SECURITY DEFINER. NÃO altera schema.
-- NÃO toca em pagamento, platform_credits, campaigns nem approve-delivery.

-- 1) Helper SECURITY DEFINER: quebra a auto-referência da policy.
CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  _conversation_id uuid,
  _user_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = _conversation_id
      AND cp.user_id = _user_id
  );
$$;

-- 2) conversation_participants: trocar o SELECT recursivo pela função.
DROP POLICY IF EXISTS "Users can view participants of their conversations"
  ON public.conversation_participants;
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants FOR SELECT
USING (public.is_conversation_participant(conversation_id, auth.uid()));

-- 3) conversations: reforçar SELECT via a mesma função (equivalente, sem recursão cruzada).
DROP POLICY IF EXISTS "Users can view own conversations"
  ON public.conversations;
CREATE POLICY "Users can view own conversations"
ON public.conversations FOR SELECT
USING (public.is_conversation_participant(id, auth.uid()));

-- 4) messages: reforçar SELECT e INSERT via a mesma função (mantém semântica atual).
DROP POLICY IF EXISTS "Users can view messages in their conversations"
  ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (public.is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Users can send messages to their conversations"
  ON public.messages;
CREATE POLICY "Users can send messages to their conversations"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_conversation_participant(conversation_id, auth.uid())
);

-- Observação: INSERT/UPDATE/DELETE de conversations e conversation_participants
-- permanecem inalterados (WITH CHECK auth.uid() IS NOT NULL / user_id = auth.uid()).
-- Realtime e trigger já estão configurados na migration 20260215103519 — não repetir.
-- (H) mapa/domínio — território + pontuação server-side
-- ============================================================================
-- MVP 2.1 — mapa-dominio: escopo de território na campanha + pontuação server-side
-- Aditivo, sem perda de dado. NÃO toca em pagamento (funded continua via webhook).
-- ============================================================================

-- (1) CAMPANHAS: escopo geográfico do domínio (default 'cidade' => tudo legado válido)
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS territory_scope text NOT NULL DEFAULT 'cidade'; -- rua|bairro|cidade|zona
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS territory_name text;         -- nome do território (ex: "Rua XV", "Centro", "Sorocaba")
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS territory_neighborhood text; -- bairro (quando aplicável)
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS territory_street text;       -- rua (quando escopo=rua)

-- (2) CANDIDATURAS: trava de idempotência da pontuação de território
ALTER TABLE public.campaign_applications ADD COLUMN IF NOT EXISTS territory_awarded_at timestamptz;

-- (3) territories: score por escopo — pontos por vaga aprovada. Índice p/ leitura geo.
ALTER TABLE public.territories ADD COLUMN IF NOT EXISTS neighborhood text;
CREATE INDEX IF NOT EXISTS territories_scope_city_idx ON public.territories(scope, city, state);
CREATE INDEX IF NOT EXISTS territories_owner_idx ON public.territories(owner_user_id);

-- (4) RPC de PONTUAÇÃO (SECURITY DEFINER) — só a edge function (service_role) chama.
-- Idempotente por application: não repontua se territory_awarded_at já setado.
-- Upserta o território, soma o score e recomputa o dono (maior score no território).
CREATE OR REPLACE FUNCTION public.award_territory(
  _application_id uuid, _points numeric DEFAULT 10
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _app record; _camp record; _b record;
  _scope text; _tname text; _city text; _state text; _nb text;
  _owner uuid;
BEGIN
  SELECT * INTO _app FROM public.campaign_applications WHERE id = _application_id;
  IF _app IS NULL OR _app.territory_awarded_at IS NOT NULL THEN RETURN; END IF; -- já pontuado

  SELECT * INTO _camp FROM public.campaigns WHERE id = _app.campaign_id;
  IF _camp IS NULL THEN RETURN; END IF;
  SELECT latitude, longitude, city, state INTO _b FROM public.brands WHERE id = _camp.brand_id;

  _scope := COALESCE(_camp.territory_scope, 'cidade');
  _city  := COALESCE(_camp.target_city, _b.city);
  _state := COALESCE(_camp.target_state, _b.state);
  _nb    := _camp.territory_neighborhood;
  _tname := COALESCE(
    NULLIF(_camp.territory_name, ''),
    CASE _scope WHEN 'rua' THEN _camp.territory_street
                WHEN 'bairro' THEN _camp.territory_neighborhood
                ELSE _city END,
    _city, 'Território'
  );

  -- upsert do território (soma score)
  INSERT INTO public.territories (scope, name, city, state, neighborhood, score, latitude, longitude, updated_at)
  VALUES (_scope, _tname, _city, _state, _nb, _points, _b.latitude, _b.longitude, now())
  ON CONFLICT (scope, name, city, state)
  DO UPDATE SET score = public.territories.score + EXCLUDED.score,
                latitude = COALESCE(public.territories.latitude, EXCLUDED.latitude),
                longitude = COALESCE(public.territories.longitude, EXCLUDED.longitude),
                neighborhood = COALESCE(public.territories.neighborhood, EXCLUDED.neighborhood),
                updated_at = now();

  -- recomputa o dono: influencer com mais vagas aprovadas/pagas neste território
  SELECT ca.influencer_user_id INTO _owner
  FROM public.campaign_applications ca
  JOIN public.campaigns c ON c.id = ca.campaign_id
  WHERE ca.status IN ('approved','paid')
    AND COALESCE(c.territory_scope,'cidade') = _scope
    AND COALESCE(NULLIF(c.territory_name,''),
          CASE COALESCE(c.territory_scope,'cidade')
            WHEN 'rua' THEN c.territory_street WHEN 'bairro' THEN c.territory_neighborhood
            ELSE COALESCE(c.target_city, _city) END, _city, 'Território') = _tname
  GROUP BY ca.influencer_user_id
  ORDER BY count(*) DESC
  LIMIT 1;

  UPDATE public.territories SET owner_user_id = _owner
   WHERE scope = _scope AND name = _tname
     AND COALESCE(city,'') = COALESCE(_city,'') AND COALESCE(state,'') = COALESCE(_state,'');

  -- trava idempotência
  UPDATE public.campaign_applications SET territory_awarded_at = now() WHERE id = _application_id;
END;
$$;
REVOKE ALL ON FUNCTION public.award_territory(uuid, numeric) FROM public, anon, authenticated; -- só service_role

-- (5) RPC de LEITURA — territórios perto (dono da rua/bairro/cidade). Stable, público.
CREATE OR REPLACE FUNCTION public.territories_near(
  _lat numeric, _lon numeric, _radius_km numeric DEFAULT 50, _scope text DEFAULT NULL, _limit int DEFAULT 30
) RETURNS TABLE (
  id uuid, scope text, name text, city text, state text, neighborhood text,
  score numeric, latitude double precision, longitude double precision,
  owner_user_id uuid, owner_username text, owner_display_name text, owner_avatar_url text,
  owner_level integer, distance_km numeric
) LANGUAGE sql STABLE AS $$
  SELECT t.id, t.scope, t.name, t.city, t.state, t.neighborhood, t.score,
         t.latitude, t.longitude, t.owner_user_id,
         p.username, p.display_name, p.avatar_url, p.level,
         CASE WHEN t.latitude IS NULL THEN NULL
              ELSE public.haversine_km(_lat, _lon, t.latitude::numeric, t.longitude::numeric) END AS distance_km
  FROM public.territories t
  LEFT JOIN public.profiles p ON p.user_id = t.owner_user_id
  WHERE (_scope IS NULL OR t.scope = _scope)
    AND (t.latitude IS NULL OR public.haversine_km(_lat, _lon, t.latitude::numeric, t.longitude::numeric) <= _radius_km)
  ORDER BY t.score DESC
  LIMIT _limit;
$$;
-- (G) feed de atividade — tabela + triggers BLINDADOS (EXCEPTION)
-- MVP2.1 — feed de atividade (mural). BLINDADO: cada trigger tem EXCEPTION pra o
-- mural NUNCA reverter pagamento/level/território, e o handle_new_user preserva os
-- 2 inserts essenciais + activity só num sub-bloco protegido (não bloqueia cadastro).

-- (1) TABELA
CREATE TABLE IF NOT EXISTS public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  type text NOT NULL,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  city text,
  street text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_events_created_idx ON public.activity_events(created_at DESC);
CREATE INDEX IF NOT EXISTS activity_events_city_idx ON public.activity_events(city);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity viewable" ON public.activity_events;
CREATE POLICY "activity viewable" ON public.activity_events FOR SELECT USING (true);
-- Sem policy de INSERT: só os triggers SECURITY DEFINER escrevem.

-- Realtime (idempotente — não falha se já estiver na publication)
DO $pub$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_events;
EXCEPTION WHEN OTHERS THEN NULL;
END $pub$;

-- (2a) CAMPANHA FEITA — status vira approved/paid. BLINDADO.
CREATE OR REPLACE FUNCTION public.emit_activity_campaign_done()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    IF NEW.status IN ('approved','paid') AND OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.activity_events (actor_user_id, type, target_id, metadata, city, street)
      SELECT NEW.influencer_user_id, 'campaign_done', NEW.campaign_id,
             jsonb_build_object('application_id', NEW.id), p.city, p.street
      FROM public.profiles p WHERE p.user_id = NEW.influencer_user_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL; -- mural NUNCA reverte aprovação/pagamento
  END;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_activity_campaign_done ON public.campaign_applications;
CREATE TRIGGER trg_activity_campaign_done
  AFTER UPDATE ON public.campaign_applications
  FOR EACH ROW EXECUTE FUNCTION public.emit_activity_campaign_done();

-- (2b) LEVEL-UP — tier (level text) muda. BLINDADO.
CREATE OR REPLACE FUNCTION public.emit_activity_xp_levelup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    IF NEW.level IS DISTINCT FROM OLD.level THEN
      INSERT INTO public.activity_events (actor_user_id, type, target_id, metadata, city, street)
      SELECT NEW.user_id, 'xp_levelup', NULL,
             jsonb_build_object('from', OLD.level, 'to', NEW.level, 'total_xp', NEW.total_xp), p.city, p.street
      FROM public.profiles p WHERE p.user_id = NEW.user_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_activity_xp_levelup ON public.user_levels;
CREATE TRIGGER trg_activity_xp_levelup
  AFTER UPDATE ON public.user_levels
  FOR EACH ROW EXECUTE FUNCTION public.emit_activity_xp_levelup();

-- (2c) DONO DA RUA — owner_user_id muda. BLINDADO.
CREATE OR REPLACE FUNCTION public.emit_activity_street_owner()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    IF NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id AND NEW.owner_user_id IS NOT NULL THEN
      INSERT INTO public.activity_events (actor_user_id, type, target_id, metadata, city, street)
      VALUES (NEW.owner_user_id, 'street_owner', NEW.id,
              jsonb_build_object('scope', NEW.scope, 'name', NEW.name), NEW.city, NEW.name);
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_activity_street_owner ON public.territories;
CREATE TRIGGER trg_activity_street_owner
  AFTER UPDATE ON public.territories
  FOR EACH ROW EXECUTE FUNCTION public.emit_activity_street_owner();

-- (2d) NOVO CADASTRO — preserva os 2 inserts ESSENCIAIS (sem proteção, como hoje)
-- e ADICIONA o activity num sub-bloco protegido (falha do mural NÃO bloqueia cadastro).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id) VALUES (NEW.id);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  BEGIN
    INSERT INTO public.activity_events (actor_user_id, type) VALUES (NEW.id, 'new_signup');
  EXCEPTION WHEN OTHERS THEN NULL; -- mural nunca bloqueia o cadastro
  END;
  RETURN NEW;
END; $$;
