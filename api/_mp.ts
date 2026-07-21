// =============================================================================
// api/_mp.ts — helpers compartilhados do Mercado Pago (arquivo com "_" não vira rota).
//
// O PROBLEMA QUE ISSO RESOLVE: o access_token que o afiliado nos dá via OAuth
// vale 180 dias. Sem renovar, o pagamento dele para de funcionar SOZINHO, um
// afiliado por vez, na data em que cada um conectou — e falha em silêncio.
//
// getSellerToken() renova preguiçosamente: se falta menos de 30 dias pro
// vencimento, troca o refresh_token por um par novo ANTES de usar. O MP rotaciona
// o refresh_token a cada renovação, então o novo TEM que ser regravado.
// =============================================================================
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_CLIENT_ID = process.env.MP_APP_CLIENT_ID;
const MP_CLIENT_SECRET = process.env.MP_APP_CLIENT_SECRET;

const RENEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // renova faltando 30 dias

export function sb(path: string, opts: any = {}) {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SB_KEY as string, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
}

export async function sbOne(path: string) {
  const r = await sb(path);
  const j = await r.json().catch(() => null);
  return Array.isArray(j) && j.length ? j[0] : null;
}

// Grava o par de tokens novo (access + refresh rotacionado) na tabela trancada.
async function persist(userId: string, tok: any) {
  await sb(`affiliate_mp_accounts?user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      access_token: tok.access_token,
      // O MP rotaciona o refresh_token: se não regravar, a PRÓXIMA renovação falha.
      refresh_token: tok.refresh_token ?? undefined,
      public_key: tok.public_key ?? undefined,
      scope: tok.scope ?? undefined,
      live_mode: typeof tok.live_mode === "boolean" ? tok.live_mode : undefined,
      expires_at: tok.expires_in ? new Date(Date.now() + Number(tok.expires_in) * 1000).toISOString() : undefined,
      refreshed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });
}

/**
 * Devolve um access_token VÁLIDO do afiliado, renovando se estiver perto de vencer.
 * Retorna null se ele não conectou o MP ou se a renovação falhou.
 */
export async function getSellerToken(userId: string): Promise<string | null> {
  const acc = await sbOne(`affiliate_mp_accounts?user_id=eq.${encodeURIComponent(userId)}&select=access_token,refresh_token,expires_at&limit=1`);
  if (!acc?.access_token) return null;

  const expMs = acc.expires_at ? Date.parse(acc.expires_at) : NaN;
  const precisaRenovar = Number.isFinite(expMs) && expMs - Date.now() < RENEW_WINDOW_MS;
  if (!precisaRenovar || !acc.refresh_token || !MP_CLIENT_ID || !MP_CLIENT_SECRET) {
    // Mesmo vencido, devolve o que temos: melhor tentar e receber 401 do MP do
    // que travar o pagamento por uma conta de data local.
    return acc.access_token;
  }

  try {
    const r = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: MP_CLIENT_ID, client_secret: MP_CLIENT_SECRET,
        grant_type: "refresh_token", refresh_token: acc.refresh_token,
      }),
    });
    const tok = await r.json();
    if (!r.ok || !tok?.access_token) {
      console.error("mp refresh falhou:", JSON.stringify(tok).slice(0, 160));
      return acc.access_token; // segue com o antigo; se estiver morto o MP avisa
    }
    await persist(userId, tok);
    return tok.access_token as string;
  } catch (e) {
    console.error("mp refresh:", e);
    return acc.access_token;
  }
}
