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
// Em caso de erro, mostra uma PÁGINA com o motivo técnico (código curto) — pra
// diagnosticar de um print, já que um toast que some não deixa rastro.
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

function cookie(req: any, name: string): string {
  const raw = String(req.headers?.cookie || "");
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return "";
}

// Valida o state assinado. Devolve { userId } ou { erro } com o motivo exato
// (pra diagnóstico: distingue cookie ausente de nonce diferente de assinatura).
function verifyState(state: string, secret: string, nonceCookie: string): { userId?: string; erro?: string } {
  let raw = "";
  try { raw = Buffer.from(state, "base64url").toString("utf8"); } catch { return { erro: "state_ilegivel" }; }
  const parts = raw.split(".");
  if (parts.length !== 4) return { erro: "state_formato" };
  const [userId, ts, nonce, sig] = parts;
  if (!nonceCookie) return { erro: "cookie_ausente" };       // o cookie não voltou (SameSite/navegador)
  if (nonce !== nonceCookie) return { erro: "nonce_diferente" };
  const expected = createHmac("sha256", secret).update(`${userId}.${ts}.${nonce}`).digest("hex").slice(0, 32);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { erro: "assinatura" };
  if (Date.now() - Number(ts) > STATE_TTL_MS) return { erro: "expirou" };
  return { userId };
}

// Página de erro visível (à prova de print) — nunca vaza token.
// Escapa qualquer texto antes de ir pro HTML — `motivo`/`dica` podem carregar
// input do provider (ex.: ?error=<script>), então nunca interpolar cru (XSS refletido).
const esc = (s: string) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

function errorPage(res: any, motivo: string, dica: string) {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Conexão Mercado Pago</title>
<style>body{margin:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0a0a0f;color:#e8e8ee;display:grid;place-items:center;min-height:100vh;padding:24px}
.c{max-width:420px;text-align:center}.i{font-size:44px}.t{font-size:20px;font-weight:800;margin:14px 0 6px}
.d{color:#c5c5d2;font-size:14px;line-height:1.5}.code{display:inline-block;margin-top:16px;font-family:ui-monospace,Menlo,monospace;font-size:12px;color:#ff2d78;background:rgba(255,45,120,.1);border:1px solid rgba(255,45,120,.25);border-radius:8px;padding:6px 12px}
.b{display:inline-block;margin-top:22px;background:linear-gradient(135deg,#ff2d78,#8b5cf6);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:99px}</style></head>
<body><div class="c"><div class="i">🔌</div><div class="t">Não deu pra conectar o Mercado Pago</div>
<div class="d">${esc(dica)}</div><div class="code">motivo: ${esc(motivo)}</div><br>
<a class="b" href="${APP_URL}/wallet">Voltar e tentar de novo</a></div></body></html>`;
  // Página de erro NÃO carrega nada externo nem roda script — CSP estrita mata
  // qualquer XSS que passe do escape, e no-store impede cache do callback.
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(200).send(html);
}

export default async function handler(req: any, res: any) {
  try {
    if (!SB_URL || !SB_KEY || !MP_CLIENT_ID || !MP_CLIENT_SECRET) return errorPage(res, "env_ausente", "A integração ainda não está configurada no servidor.");

    const code = String(req.query?.code || "");
    const state = String(req.query?.state || "");
    // O MP pode voltar com erro próprio (usuário negou, app mal configurada).
    if (req.query?.error) return errorPage(res, `mp_${String(req.query.error).slice(0, 40)}`, "O Mercado Pago recusou a autorização.");
    if (!code || !state) return errorPage(res, "sem_code", "O Mercado Pago não devolveu o código de autorização.");

    const chk = verifyState(state, SB_KEY, cookie(req, "mp_oauth_nonce"));
    // Queima o cookie (uso único).
    res.setHeader("Set-Cookie", "mp_oauth_nonce=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0");
    if (!chk.userId) {
      const dica = chk.erro === "cookie_ausente"
        ? "O navegador não devolveu o cookie de segurança na volta. Tente de novo na MESMA aba, sem trocar de navegador."
        : "A sessão de conexão não bateu. Comece de novo pela Carteira.";
      return errorPage(res, chk.erro || "state", dica);
    }
    const userId = chk.userId;

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
    const tok = await tokRes.json().catch(() => ({}));
    if (!tokRes.ok || !tok?.access_token || !tok?.user_id) {
      // NUNCA logar o corpo (tem token vivo). O MP manda um 'error' curto: usar pra diagnóstico.
      const mpErr = String(tok?.error || tok?.message || `http_${tokRes.status}`).slice(0, 60);
      console.error("mp oauth token falhou:", tokRes.status, mpErr);
      const dica = /redirect/i.test(mpErr)
        ? "O link de redirecionamento no painel do Mercado Pago não bate com o do sistema. Precisa ser EXATAMENTE: " + `${APP_URL}/api/mp-oauth-callback`
        : /client|unauthorized/i.test(mpErr)
        ? "As credenciais (Client ID/Secret) da aplicação não conferem."
        : "O Mercado Pago recusou a troca do código.";
      return errorPage(res, `troca_${mpErr}`, dica);
    }

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
      return errorPage(res, "salvar", "Conectou no Mercado Pago mas não deu pra salvar aqui. Tente de novo.");
    }

    await sb(`profiles?user_id=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ mp_connected: true }),
    });

    return res.redirect(302, `${APP_URL}/wallet?mp=ok`);
  } catch (e) {
    console.error("mp-oauth-callback:", e);
    return errorPage(res, "inesperado", "Erro inesperado ao conectar. Tente de novo.");
  }
}
