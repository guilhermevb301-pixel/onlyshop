import { ApiError } from "./auth.js";
import { supabaseAdminRequest } from "./supabase.js";

let renewal: Promise<string> | null = null;
export async function getMarketplaceToken(): Promise<string> {
  const accountUserId = process.env.MP_PLATFORM_OAUTH_USER_ID;
  if (!accountUserId) {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) throw new ApiError(503, "Mercado Pago não configurado");
    return token;
  }
  if (renewal) return renewal;
  renewal = loadToken(accountUserId);
  try { return await renewal; } finally { renewal = null; }
}

async function loadToken(userId: string): Promise<string> {
  const rows = await supabaseAdminRequest<Array<{ access_token: string; refresh_token: string; mp_user_id: string; expires_at: string }>>(
    `affiliate_mp_accounts?user_id=eq.${encodeURIComponent(userId)}&select=access_token,refresh_token,mp_user_id,expires_at&limit=1`,
  );
  const account = rows[0];
  if (!account?.access_token || account.mp_user_id !== process.env.MP_PLATFORM_USER_ID) throw new ApiError(503, "Conta Mercado Pago da plataforma precisa ser reconectada");
  const expires = Date.parse(account.expires_at);
  if (!Number.isFinite(expires)) throw new ApiError(503, "Validade da conexão Mercado Pago não confirmada");
  if (expires - Date.now() > 30 * 86400_000) return account.access_token;
  if (!account.refresh_token) throw new ApiError(503, "Reconecte o Mercado Pago da plataforma");
  const response = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant_type: "refresh_token", client_id: process.env.MP_APP_CLIENT_ID, client_secret: process.env.MP_APP_CLIENT_SECRET, refresh_token: account.refresh_token }),
  });
  const token = await response.json();
  if (!response.ok || !token.access_token || !token.refresh_token || String(token.user_id) !== account.mp_user_id || !(Number(token.expires_in) > 0)) throw new ApiError(503, "Não foi possível renovar a conexão Mercado Pago da plataforma");
  await supabaseAdminRequest(`affiliate_mp_accounts?user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH", body: JSON.stringify({ access_token: token.access_token, refresh_token: token.refresh_token, expires_at: new Date(Date.now() + Number(token.expires_in) * 1000).toISOString(), refreshed_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  });
  return token.access_token;
}
