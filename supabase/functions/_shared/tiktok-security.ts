const DEFAULT_ORIGIN = "https://onlyshoptok.vercel.app";

function allowedOrigins(): Set<string> {
  return new Set(
    (Deno.env.get("ALLOWED_ORIGINS") || DEFAULT_ORIGIN)
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const selected = allowedOrigins().has(origin) ? origin : DEFAULT_ORIGIN;
  return {
    "Access-Control-Allow-Origin": selected,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

export async function authenticateUser(req: Request): Promise<{ id: string }> {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Error("UNAUTHORIZED");
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) throw new Error("SERVER_CONFIG");
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: anonKey },
  });
  if (!response.ok) throw new Error("UNAUTHORIZED");
  const user = await response.json();
  if (!user?.id) throw new Error("UNAUTHORIZED");
  return { id: user.id };
}

function serviceHeaders(): Record<string, string> {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) throw new Error("SERVER_CONFIG");
  return { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
}

export async function getTikTokToken(userId: string): Promise<string> {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("SERVER_CONFIG");
  const response = await fetch(
    `${url}/rest/v1/tiktok_connections?select=access_token&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    { headers: serviceHeaders() },
  );
  if (!response.ok) throw new Error("TOKEN_LOOKUP_FAILED");
  const rows = await response.json();
  if (!rows?.[0]?.access_token) throw new Error("TIKTOK_NOT_CONNECTED");
  return rows[0].access_token;
}

export async function claimEdgeUsage(req: Request, operation: string): Promise<boolean> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = req.headers.get("authorization") || "";
  if (!url || !key || !authorization) throw new Error("SERVER_CONFIG");
  const response = await fetch(`${url}/rest/v1/rpc/claim_my_api_usage`, {
    method: "POST",
    headers: { apikey: key, Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ _operation: operation }),
  });
  if (!response.ok) throw new Error("USAGE_CLAIM_FAILED");
  return (await response.json()) === true;
}

export async function saveTikTokConnection(userId: string, tokenData: any, userInfo: any): Promise<void> {
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("SERVER_CONFIG");
  const response = await fetch(`${url}/rest/v1/tiktok_connections?on_conflict=user_id`, {
    method: "POST",
    headers: { ...serviceHeaders(), Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      user_id: userId,
      tiktok_user_id: tokenData.open_id,
      tiktok_username: userInfo.username || null,
      display_name: userInfo.display_name || null,
      avatar_url: userInfo.avatar_url || null,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: new Date(Date.now() + Number(tokenData.expires_in || 0) * 1000).toISOString(),
      scopes: String(tokenData.scope || "").split(",").filter(Boolean),
      followers_count: userInfo.follower_count || 0,
      following_count: userInfo.following_count || 0,
      likes_count: userInfo.likes_count || 0,
      video_count: userInfo.video_count || 0,
      is_verified: Boolean(userInfo.is_verified),
      last_synced_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error("CONNECTION_SAVE_FAILED");
}

export function errorResponse(req: Request, error: unknown): Response {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  if (code === "UNAUTHORIZED") return json(req, { success: false, error: "Unauthorized" }, 401);
  if (code === "TIKTOK_NOT_CONNECTED") return json(req, { success: false, error: "TikTok not connected" }, 409);
  console.error("TikTok edge error:", code);
  return json(req, { success: false, error: "Request failed" }, 500);
}
