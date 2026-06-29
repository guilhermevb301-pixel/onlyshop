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
export const config = { maxDuration: 30 };

const MP_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
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

export default async function handler(req: any, res: any) {
  try {
    if (!MP_TOKEN || !SB_URL || !SB_KEY) return res.status(200).json({ ok: true, skipped: "env ausente" });

    const body = typeof req.body === "string" ? safeJson(req.body) : (req.body || {});
    const type = req.query?.type || req.query?.topic || body?.type;
    const paymentId = req.query?.["data.id"] || body?.data?.id || req.query?.id;
    if (type && String(type) !== "payment") return res.status(200).json({ ok: true, ignored: String(type) });
    if (!paymentId) return res.status(200).json({ ok: true, no_id: true });

    // Confirma o pagamento real no Mercado Pago.
    const pr = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });
    const pay = await pr.json();
    if (pay?.status !== "approved") return res.status(200).json({ ok: true, status: pay?.status });

    const campaignId = pay.external_reference || pay.metadata?.campaign_id;
    const brandUserId = pay.metadata?.brand_user_id || "";
    const amount = Number(pay.transaction_amount || pay.metadata?.amount || 0);
    if (!campaignId) return res.status(200).json({ ok: true, no_campaign: true });

    // Idempotência: já processei esse pagamento? então não duplica.
    const dupRes = await sb(`platform_credits?provider_ref=eq.${encodeURIComponent(String(paymentId))}&select=id&limit=1`);
    const dup = await dupRes.json();
    if (Array.isArray(dup) && dup.length) return res.status(200).json({ ok: true, already: true });

    // 1) Campanha paga -> no ar.
    await sb(`campaigns?id=eq.${encodeURIComponent(String(campaignId))}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ funded: true, status: "active" }),
    });

    // 2) Registra o dinheiro entrando + reservado pra campanha (na conta do lojista).
    if (brandUserId && amount > 0) {
      const now = new Date().toISOString();
      await sb("platform_credits", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify([
          { user_id: brandUserId, kind: "topup", amount, campaign_id: campaignId, status: "completed", provider: "mercadopago", provider_ref: String(paymentId), created_at: now },
          { user_id: brandUserId, kind: "campaign_hold", amount: -amount, campaign_id: campaignId, status: "completed", provider: "mercadopago", provider_ref: String(paymentId), created_at: now },
        ]),
      });
    }
    return res.status(200).json({ ok: true, funded: campaignId });
  } catch (e) {
    // Sempre 200 (senão o MP reenvia em loop). Loga o erro.
    console.error("mp-webhook:", e);
    return res.status(200).json({ ok: false, error: e instanceof Error ? e.message : "erro" });
  }
}
