-- Reputation uses server timestamps and real enrollment, not fields supplied by clients.
CREATE OR REPLACE FUNCTION public.track_business_milestones() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE auto_accept boolean;
BEGIN
 IF TG_OP='INSERT' THEN
  IF auth.uid() IS NOT NULL THEN
   IF auth.uid()<>NEW.influencer_user_id THEN RAISE EXCEPTION 'A candidatura deve ser iniciada pelo creator' USING ERRCODE='42501'; END IF;
   SELECT c.auto_accept INTO auto_accept FROM campaigns c WHERE c.id=NEW.campaign_id;
   NEW.status:=CASE WHEN auto_accept IS TRUE THEN 'accepted' ELSE 'applied' END;
  END IF;
  NEW.created_at:=now(); NEW.accepted_at:=CASE WHEN NEW.status='accepted' THEN now() ELSE NULL END;
  NEW.delivered_at:=NULL; NEW.completed_at:=NULL;
 ELSE
  IF NEW.campaign_id IS DISTINCT FROM OLD.campaign_id OR NEW.influencer_user_id IS DISTINCT FROM OLD.influencer_user_id THEN
   RAISE EXCEPTION 'Não é possível trocar as partes de uma candidatura' USING ERRCODE='check_violation';
  END IF;
  NEW.created_at:=OLD.created_at;
  NEW.accepted_at:=OLD.accepted_at; NEW.delivered_at:=OLD.delivered_at; NEW.completed_at:=OLD.completed_at;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
   IF NEW.status='accepted' AND NEW.accepted_at IS NULL THEN NEW.accepted_at:=now(); END IF;
   IF NEW.status='delivered' AND NEW.delivered_at IS NULL THEN NEW.delivered_at:=now(); END IF;
   IF NEW.status IN ('approved','paid') AND NEW.completed_at IS NULL THEN NEW.completed_at:=now(); END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER business_milestones ON public.campaign_applications;
CREATE TRIGGER business_milestones BEFORE INSERT OR UPDATE ON public.campaign_applications FOR EACH ROW EXECUTE FUNCTION public.track_business_milestones();
CREATE OR REPLACE FUNCTION public.business_can_rate(_application_id uuid,_rated_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT _rated_user_id<>auth.uid() AND EXISTS(SELECT 1 FROM campaign_applications a JOIN campaigns c ON c.id=a.campaign_id JOIN brands b ON b.id=c.brand_id
 WHERE a.id=_application_id AND c.funded AND a.status IN ('approved','paid') AND
 ((auth.uid()=b.user_id AND _rated_user_id=a.influencer_user_id) OR(auth.uid()=a.influencer_user_id AND _rated_user_id=b.user_id)));
$$;
