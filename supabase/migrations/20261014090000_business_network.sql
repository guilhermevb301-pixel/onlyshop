-- Private conversations, mutual business feed, verified public reputation.
CREATE OR REPLACE FUNCTION public.business_mutual(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT _a IS NOT NULL AND _b IS NOT NULL AND EXISTS(SELECT 1 FROM follows WHERE follower_id=_a AND following_id=_b)
    AND EXISTS(SELECT 1 FROM follows WHERE follower_id=_b AND following_id=_a);
$$;
REVOKE ALL ON FUNCTION public.business_mutual(uuid,uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.business_mutual(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.start_business_conversation(_other_user_id uuid DEFAULT NULL, _application_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE me uuid:=auth.uid(); other_user uuid:=_other_user_id; app record; conversation uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Faça login para conversar' USING ERRCODE='42501'; END IF;
  IF _application_id IS NOT NULL THEN
    SELECT a.influencer_user_id,b.user_id AS brand_user_id,a.status INTO app
    FROM campaign_applications a JOIN campaigns c ON c.id=a.campaign_id JOIN brands b ON b.id=c.brand_id WHERE a.id=_application_id;
    IF NOT FOUND OR app.status NOT IN ('accepted','delivered','approved','paid') THEN RAISE EXCEPTION 'Conversa disponível após a contratação' USING ERRCODE='42501'; END IF;
    IF me=app.brand_user_id THEN other_user:=app.influencer_user_id;
    ELSIF me=app.influencer_user_id THEN other_user:=app.brand_user_id;
    ELSE RAISE EXCEPTION 'Você não participa desta campanha' USING ERRCODE='42501'; END IF;
  END IF;
  IF other_user IS NULL OR other_user=me OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=other_user) THEN RAISE EXCEPTION 'Contato inválido'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(least(me::text,other_user::text)||greatest(me::text,other_user::text)));
  SELECT a.conversation_id INTO conversation FROM conversation_participants a JOIN conversation_participants b USING(conversation_id)
    WHERE a.user_id=me AND b.user_id=other_user AND (SELECT count(*) FROM conversation_participants p WHERE p.conversation_id=a.conversation_id)=2 LIMIT 1;
  IF conversation IS NOT NULL THEN RETURN conversation; END IF;
  IF _application_id IS NULL AND NOT public.business_mutual(me,other_user) AND NOT EXISTS(
    SELECT 1 FROM campaign_applications a JOIN campaigns c ON c.id=a.campaign_id JOIN brands b ON b.id=c.brand_id
    WHERE a.status IN ('accepted','delivered','approved','paid') AND ((a.influencer_user_id=me AND b.user_id=other_user) OR (a.influencer_user_id=other_user AND b.user_id=me)))
  THEN RAISE EXCEPTION 'Siga este perfil e aguarde que ele siga você de volta para conversar' USING ERRCODE='42501'; END IF;
  INSERT INTO conversations DEFAULT VALUES RETURNING id INTO conversation;
  INSERT INTO conversation_participants(conversation_id,user_id) VALUES(conversation,me),(conversation,other_user);
  RETURN conversation;
END $$;
REVOKE ALL ON FUNCTION public.start_business_conversation(uuid,uuid) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.start_business_conversation(uuid,uuid) TO authenticated;
REVOKE INSERT ON public.conversations,public.conversation_participants FROM authenticated,anon;

ALTER TABLE public.campaign_applications ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE public.campaign_applications ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.campaign_applications ADD COLUMN IF NOT EXISTS completed_at timestamptz;
CREATE OR REPLACE FUNCTION public.track_business_milestones() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  NEW.accepted_at:=OLD.accepted_at; NEW.delivered_at:=OLD.delivered_at; NEW.completed_at:=OLD.completed_at;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status='accepted' AND NEW.accepted_at IS NULL THEN NEW.accepted_at:=now(); END IF;
    IF NEW.status='delivered' AND NEW.delivered_at IS NULL THEN NEW.delivered_at:=now(); END IF;
    IF NEW.status IN ('approved','paid') AND NEW.completed_at IS NULL THEN NEW.completed_at:=now(); END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER business_milestones BEFORE UPDATE ON public.campaign_applications FOR EACH ROW EXECUTE FUNCTION public.track_business_milestones();

CREATE OR REPLACE FUNCTION public.business_can_rate(_application_id uuid, _rated_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM campaign_applications a JOIN campaigns c ON c.id=a.campaign_id JOIN brands b ON b.id=c.brand_id
 WHERE a.id=_application_id AND a.status IN ('approved','paid') AND
 ((auth.uid()=b.user_id AND _rated_user_id=a.influencer_user_id) OR (auth.uid()=a.influencer_user_id AND _rated_user_id=b.user_id)));
$$;
REVOKE ALL ON FUNCTION public.business_can_rate(uuid,uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.business_can_rate(uuid,uuid) TO authenticated;
DROP POLICY IF EXISTS "rate as self" ON public.ratings;
CREATE POLICY "verified business ratings" ON public.ratings FOR INSERT TO authenticated
WITH CHECK(rater_user_id=(SELECT auth.uid()) AND public.business_can_rate(application_id,rated_user_id) AND length(coalesce(comment,''))<=2000);

CREATE OR REPLACE FUNCTION public.business_owns_campaign(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM campaigns c JOIN brands b ON b.id=c.brand_id WHERE c.id=_id AND b.user_id=auth.uid());
$$;
REVOKE ALL ON FUNCTION public.business_owns_campaign(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.business_owns_campaign(uuid) TO authenticated;
CREATE TABLE public.business_posts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 content text NOT NULL CHECK(length(trim(content)) BETWEEN 1 AND 3000), media_path text,
 campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(media_path IS NULL OR split_part(media_path,'/',1)=user_id::text)
);
CREATE INDEX business_posts_cursor ON public.business_posts(created_at DESC,id DESC);
CREATE INDEX business_posts_owner ON public.business_posts(user_id,created_at DESC);
ALTER TABLE public.business_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "business feed visible to mutual connections" ON public.business_posts FOR SELECT TO authenticated
USING(user_id=(SELECT auth.uid()) OR public.business_mutual((SELECT auth.uid()),user_id));
CREATE POLICY "publish business post as self" ON public.business_posts FOR INSERT TO authenticated
WITH CHECK(user_id=(SELECT auth.uid()) AND (campaign_id IS NULL OR public.business_owns_campaign(campaign_id)));
CREATE POLICY "remove own business post" ON public.business_posts FOR DELETE TO authenticated USING(user_id=(SELECT auth.uid()));
GRANT SELECT,INSERT,DELETE ON public.business_posts TO authenticated;
REVOKE ALL ON public.business_posts FROM anon;

CREATE TABLE public.business_likes(post_id uuid REFERENCES public.business_posts(id) ON DELETE CASCADE, user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, PRIMARY KEY(post_id,user_id));
ALTER TABLE public.business_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read likes on visible business posts" ON public.business_likes FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM business_posts p WHERE p.id=post_id));
CREATE POLICY "like a visible business post" ON public.business_likes FOR INSERT TO authenticated WITH CHECK(user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM business_posts p WHERE p.id=post_id));
CREATE POLICY "unlike as self" ON public.business_likes FOR DELETE TO authenticated USING(user_id=(SELECT auth.uid()));
GRANT SELECT,INSERT,DELETE ON public.business_likes TO authenticated;
REVOKE ALL ON public.business_likes FROM anon;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('business-media','business-media',false,5242880,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT(id) DO NOTHING;
CREATE POLICY "business media owner uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='business-media' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
CREATE POLICY "business media mutual readers" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='business-media' AND EXISTS(SELECT 1 FROM business_posts p WHERE p.media_path=name AND (p.user_id=(SELECT auth.uid()) OR public.business_mutual((SELECT auth.uid()),p.user_id))));
CREATE POLICY "business media owner deletes" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='business-media' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);

CREATE OR REPLACE FUNCTION public.get_business_history(_user_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(row_data ORDER BY closed_at DESC),'[]'::jsonb) FROM (
 SELECT coalesce(a.completed_at,a.updated_at) AS closed_at, jsonb_build_object(
 'id',a.id,'title',c.name,'reward_type',c.reward_type,'status',a.status,'brand_name',b.name,
 'creator_name',coalesce(p.display_name,p.username,'Creator'),'creator_id',a.influencer_user_id,'brand_user_id',b.user_id,
 'other_user_id',CASE WHEN _user_id=a.influencer_user_id THEN b.user_id ELSE a.influencer_user_id END,
 'closed_at',coalesce(a.completed_at,a.updated_at),
 'delivery_hours',CASE WHEN a.accepted_at IS NOT NULL AND a.delivered_at IS NOT NULL THEN round((extract(epoch FROM(a.delivered_at-a.accepted_at))/3600)::numeric,1) ELSE NULL END,
 'ratings',coalesce((SELECT jsonb_agg(jsonb_build_object('stars',r.stars,'comment',r.comment,'rater_user_id',r.rater_user_id,'rated_user_id',r.rated_user_id)) FROM ratings r WHERE r.application_id=a.id AND ((r.rater_user_id=b.user_id AND r.rated_user_id=a.influencer_user_id) OR(r.rater_user_id=a.influencer_user_id AND r.rated_user_id=b.user_id))),'[]'::jsonb)) AS row_data
 FROM campaign_applications a JOIN campaigns c ON c.id=a.campaign_id JOIN brands b ON b.id=c.brand_id LEFT JOIN profiles p ON p.user_id=a.influencer_user_id
 WHERE a.status IN ('approved','paid') AND (_user_id=a.influencer_user_id OR _user_id=b.user_id) ORDER BY coalesce(a.completed_at,a.updated_at) DESC LIMIT 50) x;
$$;
REVOKE ALL ON FUNCTION public.get_business_history(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_business_history(uuid) TO authenticated,anon;

CREATE OR REPLACE FUNCTION public.get_business_campaign(_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('campaign_id',c.id,'brand_id',b.id,'brand_name',b.name,'title',c.name,'reward_type',c.reward_type,'reward_amount',c.reward_amount,'slots',c.slots,'slots_filled',c.slots_filled,'target_city',c.target_city,'target_state',c.target_state,'physical_item',c.physical_item,'deadline_hours',c.deadline_hours,'distance_km',NULL,'brand_lat',b.latitude,'brand_lon',b.longitude,'campaign_kind',c.campaign_kind,'phases',c.phases)
 FROM campaigns c JOIN brands b ON b.id=c.brand_id WHERE c.id=_id AND c.funded AND c.status='active';
$$;
REVOKE ALL ON FUNCTION public.get_business_campaign(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_business_campaign(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.search_business_people(_query text DEFAULT '') RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(row_data),'[]'::jsonb) FROM(SELECT jsonb_build_object('user_id',p.user_id,'username',p.username,'display_name',coalesce(b.name,p.display_name,p.username),'avatar_url',p.avatar_url,
 'following',EXISTS(SELECT 1 FROM follows WHERE follower_id=auth.uid() AND following_id=p.user_id),
 'mutual',public.business_mutual(auth.uid(),p.user_id)) AS row_data
 FROM profiles p LEFT JOIN brands b ON b.user_id=p.user_id WHERE auth.uid() IS NOT NULL AND p.user_id<>auth.uid() AND p.username IS NOT NULL
 AND (coalesce(p.display_name,'') ILIKE '%'||left(_query,100)||'%' OR p.username ILIKE '%'||left(_query,100)||'%' OR b.name ILIKE '%'||left(_query,100)||'%') ORDER BY p.created_at DESC LIMIT 30)x;
$$;
REVOKE ALL ON FUNCTION public.search_business_people(text) FROM public;
GRANT EXECUTE ON FUNCTION public.search_business_people(text) TO authenticated;
NOTIFY pgrst,'reload schema';

