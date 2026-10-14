DROP POLICY "business media mutual readers" ON storage.objects;
CREATE POLICY "business media mutual readers" ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='business-media' AND (
 (storage.foldername(name))[1]=(SELECT auth.uid())::text
 OR EXISTS(SELECT 1 FROM public.business_posts p WHERE p.media_path=name AND public.business_mutual((SELECT auth.uid()),p.user_id))
));
