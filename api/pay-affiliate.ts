// =============================================================================
// /api/pay-affiliate — SPLIT AUTOMÁTICO (Mercado Pago Marketplace).
//
// A marca paga UMA vaga de UM afiliado aprovado. O checkout é criado com o
// access_token DO AFILIADO + marketplace_fee (nossa taxa) -> o dinheiro cai
// DIRETO na conta Mercado Pago dele, já descontada a taxa da OnlyShop.
// Não passa pelo nosso caixa: não existe saque manual nem repasse.
//
// TRAVAS DE DINHEIRO:
//  - só o DONO da campanha paga (JWT conferido no servidor);
//  - só candidatura APROVADA (accepted/approved) — nunca 'applied'/'rejected';
//  - o VALOR é calculado no servidor a partir da campanha (o cliente não manda preço);
//  - UNIQUE (application_id) em split_payments -> a mesma vaga nunca é cobrada 2x;
//  - o webhook confirma o pagamento na API do MP antes de marcar como pago.
//
// Env: MP_APP_CLIENT_ID (só p/ saber se o split está ligado), SUPABASE_URL,
//      SUPABASE_SERVICE_ROLE_KEY, APP_URL.
// =============================================================================
export const config = { maxDuration: 30 };

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.APP_URL || "https://onlyshopbrasil.com.br";
const SPLIT_ON = !!process.env.MP_APP_CLIENT_ID;          // credenciais existem (dá pra conectar/pagar)
const SPLIT_LIVE = process.env.MP_SPLIT_LIVE === "true";  // campanha NOVA nasce split (abre pra todo mundo)

const round2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

// A marca consegue escrever platform_fee_pct e phases pela RLS. Se a taxa saisse
// de la, ela zeraria a nossa receita com um update no console. Preco do servidor.
const PLATFORM_FEE_PCT = 20;
const PROCESS_GROSS = 134; // a marca paga por vaga
const PROCESS_NET = 110;   // o creator recebe

function sb(path: string, opts: any = {}) {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SB_KEY as string, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
}
const one = async (path: string) => {
  const r = await sb(path);
  const j = await r.json().catch(() => null);
  return Array.isArray(j) && j.length ? j[0] : null;
};


// -----------------------------------------------------------------------------
// Token do afiliado, renovado se preciso.
//
// O access_token que o afiliado nos da via OAuth vale 180 dias. Sem renovar, o
// pagamento dele para de funcionar SOZINHO, um afiliado por vez, na data em que
// cada um conectou — e falha em silencio. Aqui a gente renova quando falta menos
// de 30 dias. O MP ROTACIONA o refresh_token a cada renovacao: se o novo nao for
// regravado, a proxima renovacao falha.
//
// (Duplicado em pay-affiliate.ts e mp-webhook.ts de proposito: cada function do
// Vercel e um bundle isolado e import relativo entre elas nao resolve.)
// -----------------------------------------------------------------------------
const RENEW_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

async function getSellerToken(userId: string): Promise<string | null> {
  const r = await sb(`affiliate_mp_accounts?user_id=eq.${encodeURIComponent(userId)}&select=access_token,refresh_token,expires_at&limit=1`);
  const rows = await r.json().catch(() => null);
  const acc = Array.isArray(rows) && rows.length ? rows[0] : null;
  if (!acc?.access_token) return null;

  const expMs = acc.expires_at ? Date.parse(acc.expires_at) : NaN;
  const precisaRenovar = Number.isFinite(expMs) && expMs - Date.now() < RENEW_WINDOW_MS;
  const cid = process.env.MP_APP_CLIENT_ID, csec = process.env.MP_APP_CLIENT_SECRET;
  if (!precisaRenovar || !acc.refresh_token || !cid || !csec) return acc.access_token;

  try {
    const rr = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: cid, client_secret: csec, grant_type: "refresh_token", refresh_token: acc.refresh_token }),
    });
    const tok = await rr.json();
    if (!rr.ok || !tok?.access_token) {
      console.error("mp refresh falhou:", rr.status, tok?.error || tok?.message || "sem detalhe");
      return acc.access_token;
    }
    await sb(`affiliate_mp_accounts?user_id=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        access_token: tok.access_token,
        refresh_token: tok.refresh_token ?? undefined,
        scope: tok.scope ?? undefined,
        expires_at: tok.expires_in ? new Date(Date.now() + Number(tok.expires_in) * 1000).toISOString() : undefined,
        refreshed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }),
    });
    return tok.access_token as string;
  } catch (e) {
    console.error("mp refresh:", e);
    return acc.access_token;
  }
}

// Quanto a marca paga e quanto sobra pro afiliado — SEMPRE calculado aqui.
function money(camp: any): { gross: number; fee: number; net: number } {
  if (camp?.campaign_kind === "process") {
    return { gross: PROCESS_GROSS, fee: round2(PROCESS_GROSS - PROCESS_NET), net: PROCESS_NET };
  }
  const net = round2(Number(camp?.reward_amount || 0));  // o creator recebe o reward cheio
  const fee = round2(net * (PLATFORM_FEE_PCT / 100));    // a taxa sai por cima
  return { gross: round2(net + fee), fee, net };
}

export default async function handler(req: any, res: any) {
  // GET = sonda de configuração (o front esconde a UI de split enquanto off).
  if (req.method === "GET") return res.status(200).json({ configured: SPLIT_ON, live: SPLIT_LIVE });
  if (req.method !== "POST") return res.status(405).json({ error: "use POST" });
  try {
    if (!SB_URL || !SB_KEY) return res.status(500).json({ error: "Supabase não configurado" });
    if (!SPLIT_ON) return res.status(503).json({ error: "Split do Mercado Pago ainda não configurado", needsSetup: true });

    // Quem está pagando.
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "sem token" });
    const me = await (await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${token}` } })).json();
    const callerId = me?.id;
    if (!callerId) return res.status(401).json({ error: "token inválido" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const applicationId = String(body.applicationId || "");
    if (!applicationId) return res.status(400).json({ error: "applicationId obrigatório" });

    const app = await one(`campaign_applications?id=eq.${applicationId}&select=id,campaign_id,influencer_user_id,status&limit=1`);
    if (!app) return res.status(404).json({ error: "candidatura não encontrada" });

    const camp = await one(`campaigns?id=eq.${app.campaign_id}&select=id,name,brand_id,reward_amount,platform_fee_pct,campaign_kind,phases,pay_mode&limit=1`);
    if (!camp) return res.status(404).json({ error: "campanha não encontrada" });

    // TRAVA CONTRA COBRAR DUAS VEZES: campanha escrow ja foi paga inteira pela
    // marca (so fica visivel pro afiliado com funded=true). Cobrar por vaga aqui
    // seria a SEGUNDA cobranca, e o dinheiro do escrow ficaria preso.
    if (camp.pay_mode !== "split") {
      return res.status(409).json({ error: "essa campanha ja foi paga por inteiro na criacao (modelo antigo)" });
    }

    // Dono da campanha (brand_id -> brands.user_id).
    const brand = await one(`brands?id=eq.${camp.brand_id}&select=user_id&limit=1`);
    if (brand?.user_id !== callerId) return res.status(403).json({ error: "só a marca dona da campanha pode pagar" });

    // Só vaga aprovada. 'applied' = ainda em curadoria; 'rejected' = fora.
    if (!["accepted", "approved", "delivered"].includes(String(app.status))) {
      return res.status(403).json({ error: "aprove o perfil antes de pagar" });
    }

    // O afiliado precisa ter conectado o Mercado Pago — é pra onde o dinheiro vai.
    // getSellerToken renova o token se estiver perto de vencer (vale 180 dias).
    const sellerToken = await getSellerToken(String(app.influencer_user_id));
    if (!sellerToken) {
      return res.status(409).json({ error: "o creator ainda não conectou o Mercado Pago", needsAffiliateMp: true });
    }

    const { gross, fee, net } = money(camp);
    // A marca consegue escrever `phases` pela RLS, entao o valor precisa ser
    // sanidade-checado aqui: taxa negativa ou liquido maior que o bruto sairia
    // do nosso bolso.
    if (!(gross > 0) || !(net > 0) || fee < 0 || net > gross) {
      return res.status(400).json({ error: "valor da campanha inválido" });
    }

    // Reserva o registro (UNIQUE em application_id impede cobrar a vaga 2x).
    const insRes = await sb("split_payments", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([{
        application_id: applicationId, campaign_id: camp.id, brand_user_id: callerId,
        affiliate_user_id: app.influencer_user_id, gross, fee, net, status: "pending",
      }]),
    });
    let split: any = null;
    if (insRes.ok) {
      split = (await insRes.json())[0];
    } else {
      // Já existe registro pra essa vaga.
      split = await one(`split_payments?application_id=eq.${applicationId}&select=*&limit=1`);
      if (!split) return res.status(500).json({ error: "não foi possível registrar o pagamento" });
      if (split.status === "paid") return res.status(409).json({ error: "essa vaga já foi paga", already: true });
      // Ja existe um checkout aberto pra essa vaga: devolve O MESMO link. Gerar
      // outro deixaria DOIS links pagaveis com o mesmo external_reference — a
      // marca poderia pagar os dois e o segundo nao teria como ser estornado.
      if (split.preference_id && split.init_point) {
        return res.status(200).json({ configured: true, init_point: split.init_point, preference_id: split.preference_id, gross, fee, net, reused: true });
      }
    }

    // Checkout criado com o token DO AFILIADO + nossa taxa (marketplace_fee).
    const prefRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${sellerToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ title: `OnlyShop - ${String(camp.name || "Campanha").slice(0, 100)}`, quantity: 1, unit_price: gross, currency_id: "BRL" }],
        marketplace_fee: fee,
        external_reference: `split:${split.id}`,
        statement_descriptor: "ONLYSHOP",
        // O split id vai na URL do webhook: é assim que o webhook sabe de quem é
        // o token pra confirmar o pagamento na API do MP.
        notification_url: `${APP_URL}/api/mp-webhook?split=${split.id}`,
        metadata: { split_id: split.id, application_id: applicationId, campaign_id: camp.id },
        back_urls: {
          success: `${APP_URL}/brands?pago=${encodeURIComponent(applicationId)}`,
          pending: `${APP_URL}/brands?pago=${encodeURIComponent(applicationId)}`,
          failure: `${APP_URL}/brands?falhou=1`,
        },
        auto_return: "approved",
      }),
    });
    const pref = await prefRes.json();
    if (!prefRes.ok || !pref?.init_point) {
      console.error("split preference:", JSON.stringify(pref).slice(0, 240));
      await sb(`split_payments?id=eq.${split.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "failed" }) });
      return res.status(400).json({ error: pref?.message || "falha ao criar o pagamento" });
    }

    await sb(`split_payments?id=eq.${split.id}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ preference_id: pref.id, init_point: pref.init_point, status: "pending" }),
    });

    return res.status(200).json({ configured: true, init_point: pref.init_point, preference_id: pref.id, gross, fee, net });
  } catch (e) {
    console.error("pay-affiliate:", e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "erro" });
  }
}
