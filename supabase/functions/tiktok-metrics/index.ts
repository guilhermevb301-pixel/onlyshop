import { authenticateUser, corsHeaders, errorResponse, getTikTokToken, json } from "../_shared/tiktok-security.ts";

const USERINFO_URL = "https://open.tiktokapis.com/v2/user/info/";
const VIDEO_LIST_URL = "https://open.tiktokapis.com/v2/video/list/";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  try {
    const user = await authenticateUser(req);
    const accessToken = await getTikTokToken(user.id);
    const { action, cursor, max_count } = await req.json();
    if (action === "user_stats") {
      const response = await fetch(
        `${USERINFO_URL}?fields=open_id,avatar_url,display_name,username,follower_count,following_count,likes_count,video_count,is_verified`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const data = await response.json();
      return response.ok ? json(req, { success: true, data: data.data?.user }) : json(req, { success: false, error: "Failed to fetch user stats" }, response.status);
    }
    if (action === "video_list") {
      const response = await fetch(
        `${VIDEO_LIST_URL}?fields=id,title,video_description,create_time,cover_image_url,share_url,duration,like_count,comment_count,share_count,view_count`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ max_count: Math.min(Number(max_count) || 20, 20), cursor: cursor || undefined }),
        },
      );
      const data = await response.json();
      return response.ok
        ? json(req, { success: true, videos: data.data?.videos || [], cursor: data.data?.cursor, has_more: Boolean(data.data?.has_more) })
        : json(req, { success: false, error: "Failed to fetch videos" }, response.status);
    }
    return json(req, { success: false, error: "Invalid action" }, 400);
  } catch (error) {
    return errorResponse(req, error);
  }
});
