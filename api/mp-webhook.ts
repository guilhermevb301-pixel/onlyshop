// =============================================================================
// /api/mp-webhook — confirmação de pagamento do Mercado Pago (server-side).
//
// O MP chama essa URL quando um pagamento muda de status. A gente confirma o
// pagamento de verdade na API do MP e, se aprovado, marca a campanha como paga/
// no ar e registra o dinheiro (entrada + reserva) no ledger — mesmo que o lojista
// feche a aba. Idempotente (não duplica se o MP reenviar).
//
// Env: MERCADOPAGO_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// =============================================================================
import { createHmac, timingSafeEqual } from "crypto";
export const config = { maxDuration: 30 };

const MP_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path: string, opts: any = {}) {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SB_KEY as string,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
}

function safeJson(s: string) { try { return JSON.parse(s); } catch { return {}; } }

// Assinatura do Mercado Pago (header x-signature: "ts=...,v1=...").
// Manifesto: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
//
function assinaturaValida(req: any, dataId: string): boolean {
  if (!MP_WEBHOOK_SECRET) return false;
  const header = String(req.headers?.["x-signature"] || "");
  if (!header) return false;
  let ts = "", v1 = "";
  for (const parte of header.split(",")) {
    const [k, v] = parte.trim().split("=");
    if (k === "ts") ts = v; else if (k === "v1") v1 = v;
  }
  if (!ts || !v1) return false;
  const requestId = String(req.headers?.["x-request-id"] || "");
  const manifesto = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`;
  const esperado = createHmac("sha256", MP_WEBHOOK_SECRET).update(manifesto).digest("hex");
  const a = Buffer.from(v1), b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
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

// -----------------------------------------------------------------------------
// Confirmação de pagamento por SPLIT (dinheiro foi DIRETO pro afiliado).
//
// Não dá pra confiar no que chega na URL: a gente busca o pagamento na API do MP
// com o token do afiliado e só aceita se for aprovado, se o external_reference
// bater com esse split e se o valor for o combinado.
//
// O lançamento no ledger é kind='split_payout' — INFORMATIVO. Ele aparece no
// extrato do afiliado mas NÃO vira saldo sacável (o dinheiro já está na conta
// dele; virar saldo seria pagar duas vezes).
// -----------------------------------------------------------------------------
async function handleSplit(res: any, splitId: string, paymentId: string) {
  const split = await one(`split_payments?id=eq.${encodeURIComponent(splitId)}&select=*&limit=1`);
  if (!split) return res.status(200).json({ ok: true, no_split: true });
  if (split.status === "paid") return res.status(200).json({ ok: true, already: true });

  const sellerToken = await getSellerToken(String(split.affiliate_user_id));
  if (!sellerToken) return res.status(200).json({ ok: false, no_token: true });

  const pr = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  const pay = await pr.json();
  if (!pr.ok) return res.status(200).json({ ok: false, mp: pay?.message || "falha ao consultar" });
  if (pay?.status !== "approved") return res.status(200).json({ ok: true, status: pay?.status });
  if (String(pay?.external_reference || "") !== `split:${splitId}`) {
    return res.status(200).json({ ok: false, mismatch: true });
  }
  const paid = Number(pay?.transaction_amount || 0);
  if (Math.abs(paid - Number(split.gross)) > 0.01) return res.status(200).json({ ok: false, amount_mismatch: true });

  const rpc = await sb("rpc/confirm_split_payment_atomic", {
    method: "POST",
    body: JSON.stringify({ _split_id: splitId, _payment_id: String(paymentId) }),
  });
  if (!rpc.ok) throw new Error(`confirm_split_payment_atomic: ${rpc.status}`);
  const result = await rpc.json();
  if (result?.result === "already") return res.status(200).json({ ok: true, already: true });
  if (result?.result !== "ok") return res.status(200).json({ ok: false, review: result?.result || "unknown" });
  return res.status(200).json({ ok: true, split: splitId, net: result.net });
}

export default async function handler(req: any, res: any) {
  try {
    if (!SB_URL || !SB_KEY) return res.status(503).json({ error: "Supabase não configurado" });
    if (!MP_WEBHOOK_SECRET) return res.status(503).json({ error: "Webhook Mercado Pago não configurado" });

    const body = typeof req.body === "string" ? safeJson(req.body) : (req.body || {});
    const type = req.query?.type || req.query?.topic || body?.type;
    const paymentId = req.query?.["data.id"] || body?.data?.id || req.query?.id;
    if (type && String(type) !== "payment") return res.status(200).json({ ok: true, ignored: String(type) });
    if (!paymentId) return res.status(200).json({ ok: true, no_id: true });

    // Só processa notificação assinada pelo Mercado Pago.
    if (!assinaturaValida(req, String(paymentId))) {
      console.error("mp-webhook: assinatura inválida");
      return res.status(401).json({ ok: false, assinatura: "inválida" });
    }

    // SPLIT: o pagamento foi criado com o token do AFILIADO, então só o token dele
    // consulta esse pagamento. O id do split vem na URL do webhook (?split=...).
    const splitId = req.query?.split ? String(req.query.split) : "";
    if (splitId) return await handleSplit(res, splitId, String(paymentId));

    if (!MP_TOKEN) return res.status(503).json({ error: "Mercado Pago não configurado" });

    // Confirma o pagamento real no Mercado Pago.
    const pr = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });
    const pay = await pr.json();
    if (!pr.ok) throw new Error(`Mercado Pago payment lookup: ${pr.status}`);
    if (pay?.status !== "approved") return res.status(200).json({ ok: true, status: pay?.status });

    const amount = Number(pay.transaction_amount || pay.metadata?.amount || 0);
    const reference = String(pay.external_reference || "");
    const match = reference.match(/^funding:([0-9a-f-]{36})$/i);
    if (!match?.[1]) return res.status(200).json({ ok: false, review: "invalid_reference" });
    const fundingId = match[1];
    if (pay.metadata?.funding_id && String(pay.metadata.funding_id) !== fundingId) {
      return res.status(200).json({ ok: false, review: "metadata_mismatch" });
    }
    const rpc = await sb("rpc/confirm_campaign_funding", {
      method: "POST",
      body: JSON.stringify({ _funding_id: fundingId, _payment_id: String(paymentId), _paid_amount: amount }),
    });
    if (!rpc.ok) throw new Error(`confirm_campaign_funding: ${rpc.status}`);
    const result = await rpc.json();
    if (result === "ok") return res.status(200).json({ ok: true, funding: fundingId });
    if (result === "already") return res.status(200).json({ ok: true, already: true });
    return res.status(200).json({ ok: false, review: result });
  } catch (e) {
    console.error("mp-webhook:", e);
    return res.status(500).json({ ok: false, error: "falha transitória ao processar webhook" });
  }
}
