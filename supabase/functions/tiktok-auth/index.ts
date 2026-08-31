import { authenticateUser, corsHeaders, errorResponse, json, saveTikTokConnection } from "../_shared/tiktok-security.ts";

const AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const USERINFO_URL = "https://open.tiktokapis.com/v2/user/info/";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  try {
    const user = await authenticateUser(req);
    const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY");
    const clientSecret = Deno.env.get("TIKTOK_CLIENT_SECRET");
    if (!clientKey || !clientSecret) throw new Error("SERVER_CONFIG");
    const { action, code, redirect_uri } = await req.json();

    if (action === "get_auth_url") {
      const state = crypto.randomUUID();
      const scope = "user.info.basic,user.info.stats,video.publish,video.list";
      const authUrl = `${AUTH_URL}?client_key=${clientKey}&scope=${scope}&response_type=code&redirect_uri=${encodeURIComponent(redirect_uri || "")}&state=${state}`;
      return json(req, { success: true, auth_url: authUrl, state });
    }
    if (action !== "exchange_token" || !code || !redirect_uri) {
      return json(req, { success: false, error: "Invalid OAuth request" }, 400);
    }

    const tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, code, grant_type: "authorization_code", redirect_uri }),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || tokenData.error) return json(req, { success: false, error: "Token exchange failed" }, 400);

    const userResponse = await fetch(
      `${USERINFO_URL}?fields=open_id,avatar_url,display_name,username,follower_count,following_count,likes_count,video_count,is_verified`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
    );
    const userData = await userResponse.json();
    if (!userResponse.ok) return json(req, { success: false, error: "TikTok profile lookup failed" }, 502);
    const profile = userData.data?.user || {};
    await saveTikTokConnection(user.id, tokenData, profile);
    return json(req, {
      success: true,
      user: {
        tiktok_username: profile.username || null,
        display_name: profile.display_name || null,
        avatar_url: profile.avatar_url || null,
        followers_count: profile.follower_count || 0,
      },
    });
  } catch (error) {
    return errorResponse(req, error);
  }
});
