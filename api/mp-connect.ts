// =============================================================================
// /api/mp-connect — devolve a URL de autorização do Mercado Pago pro afiliado
// conectar a conta dele (split automático).
//
// SEGURANÇA — duas camadas, porque uma só não basta:
//
// 1) O `state` leva o user_id ASSINADO (HMAC). Sem isso qualquer um forjaria um
//    callback e vincularia a conta MP dele ao user_id de outra pessoa.
//
// 2) O `state` leva também um NONCE gravado num cookie HttpOnly DESTE navegador.
//    O callback só aceita se o nonce do state bater com o do cookie. Sem isso
//    existe um ataque real: o atacante gera a URL DELE, manda pra vítima
//    ("conecte seu Mercado Pago"), a vítima autoriza, e a plataforma grava o
//    access_token DA VÍTIMA sob o user_id DO ATACANTE. Amarrar ao navegador que
//    iniciou o fluxo mata isso — a vítima não tem o cookie dele.
//
// Env: MP_APP_CLIENT_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_URL (opcional).
// =============================================================================
import { createHmac, randomBytes } from "crypto";
export const config = { maxDuration: 30 };

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MP_CLIENT_ID = process.env.MP_APP_CLIENT_ID;
const APP_URL = process.env.APP_URL || "https://onlyshopbrasil.com.br";

export const OAUTH_COOKIE = "mp_oauth_nonce";

export function signState(userId: string, nonce: string, secret: string): string {
  const payload = `${userId}.${Date.now()}.${nonce}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex").slice(0, 32);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "use POST" });
  try {
    if (!SB_URL || !SB_KEY) return res.status(500).json({ error: "Supabase não configurado" });
    if (!MP_CLIENT_ID) {
      return res.status(503).json({ error: "Integração do Mercado Pago ainda não configurada", needsSetup: true });
    }

    // Quem está conectando (JWT do próprio usuário).
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "sem token" });
    const u = await (await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` } })).json();
    const userId = u?.id;
    if (!userId) return res.status(401).json({ error: "token inválido" });

    const nonce = randomBytes(16).toString("hex");
    const state = signState(userId, nonce, SB_KEY);

    // SameSite=Lax deixa o cookie voltar no redirect do Mercado Pago (navegação
    // top-level GET), mas não numa requisição disparada por outro site.
    res.setHeader("Set-Cookie", `${OAUTH_COOKIE}=${nonce}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
    const redirectUri = `${APP_URL}/api/mp-oauth-callback`;
    const url =
      `https://auth.mercadopago.com/authorization?client_id=${encodeURIComponent(MP_CLIENT_ID)}` +
      `&response_type=code&platform_id=mp&state=${encodeURIComponent(state)}` +
      // offline_access = pre-requisito pra renovar o token depois (vale 180 dias).
      `&scope=offline_access` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return res.status(200).json({ url });
  } catch (e) {
    console.error("mp-connect:", e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "erro" });
  }
}
