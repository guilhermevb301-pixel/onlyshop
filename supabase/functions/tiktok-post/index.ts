import { authenticateUser, corsHeaders, errorResponse, getTikTokToken, json } from "../_shared/tiktok-security.ts";

const PUBLISH_URL = "https://open.tiktokapis.com/v2/post/publish/video/init/";
const STATUS_URL = "https://open.tiktokapis.com/v2/post/publish/status/fetch/";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  try {
    const user = await authenticateUser(req);
    const accessToken = await getTikTokToken(user.id);
    const { action, video_url, caption, publish_id, privacy_level } = await req.json();
    let response: Response;
    if (action === "publish_video") {
      if (!video_url || !/^https:\/\//.test(video_url)) return json(req, { success: false, error: "Valid HTTPS video URL required" }, 400);
      response = await fetch(PUBLISH_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          post_info: { title: String(caption || "").slice(0, 2200), privacy_level: privacy_level || "SELF_ONLY", disable_duet: false, disable_comment: false, disable_stitch: false },
          source_info: { source: "PULL_FROM_URL", video_url },
        }),
      });
    } else if (action === "publish_status" && publish_id) {
      response = await fetch(STATUS_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ publish_id }),
      });
    } else {
      return json(req, { success: false, error: "Invalid action" }, 400);
    }
    const data = await response.json();
    if (!response.ok) return json(req, { success: false, error: "TikTok publish request failed" }, response.status);
    return action === "publish_video"
      ? json(req, { success: true, publish_id: data.data?.publish_id })
      : json(req, { success: true, status: data.data?.status, video_id: data.data?.publicaly_available_post_id?.[0] });
  } catch (error) {
    return errorResponse(req, error);
  }
});
