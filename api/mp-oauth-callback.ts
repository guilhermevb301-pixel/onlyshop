// =============================================================================
// /api/mp-oauth-callback — o Mercado Pago devolve o afiliado aqui após ele autorizar.
// Troca o `code` pelos tokens DELE e guarda na tabela trancada (service_role only),
// marcando profiles.mp_connected = true. A partir daí o split automático funciona:
// o pagamento é criado com o token dele + application_fee (nossa taxa).
//
// SEGURANÇA: só aceita `state` assinado por /api/mp-connect (HMAC, validade 10 min)
// E cujo nonce bata com o cookie HttpOnly deste navegador — sem o cookie, alguém
// mandaria o próprio link de conexão pra vítima e capturaria as credenciais MP
// dela sob o próprio user_id. Os tokens NUNCA voltam pro navegador.
//
// Env: MP_APP_CLIENT_ID, MP_APP_CLIENT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_URL.
// =============================================================================
import { createHmac, timingSafeEqual } from "crypto";
export const config = { maxDuration: 30 };

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_CLIENT_ID = process.env.MP_APP_CLIENT_ID;
const MP_CLIENT_SECRET = process.env.MP_APP_CLIENT_SECRET;
const APP_URL = process.env.APP_URL || "https://onlyshopbrasil.com.br";
const STATE_TTL_MS = 10 * 60 * 1000;

function sb(path: string, opts: any = {}) {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SB_KEY as string, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
}

// Lê um cookie da requisição (o header vem como "a=1; b=2").
function cookie(req: any, name: string): string {
  const raw = String(req.headers?.cookie || "");
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return "";
}

// Valida o state assinado e devolve o user_id (ou null).
// `nonceEsperado` é o do cookie: sem ele bater, o fluxo não começou neste navegador.
function verifyState(state: string, secret: string, nonceEsperado: string): string | null {
  try {
    const raw = Buffer.from(state, "base64url").toString("utf8");
    const parts = raw.split(".");
    if (parts.length !== 4) return null;
    const [userId, ts, nonce, sig] = parts;
    if (!nonceEsperado || nonce !== nonceEsperado) return null;
    const expected = createHmac("sha256", secret).update(`${userId}.${ts}.${nonce}`).digest("hex").slice(0, 32);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    if (Date.now() - Number(ts) > STATE_TTL_MS) return null;
    return userId;
  } catch {
    return null;
  }
}

const back = (res: any, ok: boolean, msg?: string) =>
  res.redirect(302, `${APP_URL}/wallet?mp=${ok ? "ok" : "erro"}${msg ? `&m=${encodeURIComponent(msg)}` : ""}`);

export default async function handler(req: any, res: any) {
  try {
    if (!SB_URL || !SB_KEY || !MP_CLIENT_ID || !MP_CLIENT_SECRET) return back(res, false, "integração não configurada");

    const code = String(req.query?.code || "");
    const state = String(req.query?.state || "");
    if (!code || !state) return back(res, false, "retorno inválido");

    const userId = verifyState(state, SB_KEY, cookie(req, "mp_oauth_nonce"));
    // Queima o nonce (uso único) antes de qualquer coisa.
    res.setHeader("Set-Cookie", "mp_oauth_nonce=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0");
    if (!userId) return back(res, false, "sessão expirada, tente de novo");

    // Troca o code pelos tokens DO AFILIADO.
    const tokRes = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: MP_CLIENT_ID,
        client_secret: MP_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${APP_URL}/api/mp-oauth-callback`,
      }),
    });
    const tok = await tokRes.json();
    if (!tokRes.ok || !tok?.access_token || !tok?.user_id) {
      // NUNCA logar o corpo: ele carrega access_token/refresh_token vivos.
      console.error("mp oauth token falhou:", tokRes.status, tok?.error || tok?.message || "sem detalhe");
      return back(res, false, "não foi possível conectar");
    }

    // Guarda na tabela TRANCADA (o navegador nunca vê esses tokens).
    const up = await sb("affiliate_mp_accounts?on_conflict=user_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{
        user_id: userId,
        mp_user_id: String(tok.user_id),
        access_token: tok.access_token,
        refresh_token: tok.refresh_token ?? null,
        public_key: tok.public_key ?? null,
        scope: tok.scope ?? null,
        live_mode: typeof tok.live_mode === "boolean" ? tok.live_mode : null,
        expires_at: tok.expires_in ? new Date(Date.now() + Number(tok.expires_in) * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      }]),
    });
    if (!up.ok) {
      console.error("mp save:", (await up.text()).slice(0, 160));
      return back(res, false, "erro ao salvar a conexão");
    }

    // Flag público (o app só precisa saber que conectou).
    await sb(`profiles?user_id=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ mp_connected: true }),
    });

    return back(res, true);
  } catch (e) {
    console.error("mp-oauth-callback:", e);
    return back(res, false, "erro inesperado");
  }
}
