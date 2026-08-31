-- TikTok OAuth tokens are server credentials and must never be readable or
-- writable through the browser-facing PostgREST roles.
DROP POLICY IF EXISTS "Users can view own tiktok connection" ON public.tiktok_connections;
DROP POLICY IF EXISTS "Users can insert own tiktok connection" ON public.tiktok_connections;
DROP POLICY IF EXISTS "Users can update own tiktok connection" ON public.tiktok_connections;

REVOKE ALL ON public.tiktok_connections FROM anon, authenticated;
GRANT DELETE ON public.tiktok_connections TO authenticated;

DROP POLICY IF EXISTS "Users can delete own tiktok connection" ON public.tiktok_connections;
CREATE POLICY "Users can delete own tiktok connection"
ON public.tiktok_connections FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_my_tiktok_connection()
RETURNS TABLE (
  tiktok_username text,
  display_name text,
  avatar_url text,
  followers_count integer,
  following_count integer,
  likes_count integer,
  video_count integer,
  is_verified boolean,
  last_synced_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT c.tiktok_username, c.display_name, c.avatar_url,
         c.followers_count, c.following_count, c.likes_count,
         c.video_count, c.is_verified, c.last_synced_at
  FROM public.tiktok_connections c
  WHERE c.user_id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_tiktok_connection() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_tiktok_connection() TO authenticated;
