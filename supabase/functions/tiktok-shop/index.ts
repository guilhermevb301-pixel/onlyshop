import { authenticateUser, corsHeaders, errorResponse, getTikTokToken, json } from "../_shared/tiktok-security.ts";

const SHOP_BASE = "https://open-api.tiktokglobalshop.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders(req) });
  try {
    const user = await authenticateUser(req);
    const accessToken = await getTikTokToken(user.id);
    const { action, order_id, start_time, end_time, cursor, page_size } = await req.json();
    const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "x-tts-access-token": accessToken };
    let response: Response;
    if (action === "shop_info") {
      response = await fetch(`${SHOP_BASE}/api/shop/get_authorized_shop`, { headers });
    } else if (action === "orders") {
      const params = new URLSearchParams({ page_size: String(Math.min(Number(page_size) || 20, 50)), sort_by: "CREATE_TIME", sort_type: "2" });
      if (cursor) params.set("cursor", cursor);
      if (start_time) params.set("create_time_ge", String(start_time));
      if (end_time) params.set("create_time_lt", String(end_time));
      response = await fetch(`${SHOP_BASE}/api/orders/search?${params}`, { method: "POST", headers, body: "{}" });
    } else if (action === "order_detail" && order_id) {
      response = await fetch(`${SHOP_BASE}/api/orders/detail/query`, { method: "POST", headers, body: JSON.stringify({ order_id_list: [order_id] }) });
    } else {
      return json(req, { success: false, error: "Invalid action" }, 400);
    }
    const data = await response.json();
    if (!response.ok) return json(req, { success: false, error: "TikTok Shop request failed" }, response.status);
    if (action === "shop_info") return json(req, { success: true, shops: data.data?.shop_list || [] });
    if (action === "orders") return json(req, { success: true, orders: data.data?.order_list || [], total: data.data?.total || 0, next_cursor: data.data?.next_cursor });
    return json(req, { success: true, orders: data.data?.order_list || [] });
  } catch (error) {
    return errorResponse(req, error);
  }
});
