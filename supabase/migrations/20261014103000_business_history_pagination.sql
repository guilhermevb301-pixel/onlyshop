DROP FUNCTION public.get_business_history(uuid);
CREATE FUNCTION public.get_business_history(_user_id uuid,_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(row_data ORDER BY closed_at DESC,application_id DESC),'[]'::jsonb) FROM (
 SELECT a.id AS application_id,coalesce(a.completed_at,a.updated_at) AS closed_at, jsonb_build_object(
 'id',a.id,'title',c.name,'reward_type',c.reward_type,'status',a.status,'brand_name',b.name,
 'creator_name',coalesce(p.display_name,p.username,'Creator'),'creator_id',a.influencer_user_id,'brand_user_id',b.user_id,
 'other_user_id',CASE WHEN _user_id=a.influencer_user_id THEN b.user_id ELSE a.influencer_user_id END,
 'closed_at',coalesce(a.completed_at,a.updated_at),
 'delivery_hours',CASE WHEN a.accepted_at IS NOT NULL AND a.delivered_at IS NOT NULL THEN round((extract(epoch FROM(a.delivered_at-a.accepted_at))/3600)::numeric,1) ELSE NULL END,
 'ratings',coalesce((SELECT jsonb_agg(jsonb_build_object('stars',r.stars,'comment',r.comment,'rater_user_id',r.rater_user_id,'rated_user_id',r.rated_user_id)) FROM ratings r WHERE r.application_id=a.id AND r.rater_user_id<>r.rated_user_id AND ((r.rater_user_id=b.user_id AND r.rated_user_id=a.influencer_user_id) OR(r.rater_user_id=a.influencer_user_id AND r.rated_user_id=b.user_id))),'[]'::jsonb)) AS row_data
 FROM campaign_applications a JOIN campaigns c ON c.id=a.campaign_id JOIN brands b ON b.id=c.brand_id LEFT JOIN profiles p ON p.user_id=a.influencer_user_id
 WHERE a.status IN ('approved','paid') AND (_user_id=a.influencer_user_id OR _user_id=b.user_id) ORDER BY coalesce(a.completed_at,a.updated_at) DESC,a.id DESC LIMIT 50 OFFSET greatest(coalesce(_offset,0),0)) x;
$$;
REVOKE ALL ON FUNCTION public.get_business_history(uuid,integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_business_history(uuid,integer) TO authenticated,anon;
NOTIFY pgrst,'reload schema';
