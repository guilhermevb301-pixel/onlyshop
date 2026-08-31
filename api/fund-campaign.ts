import { ApiError, authenticateRequest } from "./_lib/auth";
import { apiErrorResponse, supabaseAdminRequest } from "./_lib/supabase";

export const config = { maxDuration: 30 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function header(req: any, name: string): string {
  const value = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] ?? "" : String(value ?? "");
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "use POST" });
  try {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) throw new ApiError(503, "Mercado Pago não configurado");
    const user = await authenticateRequest(req);
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const campaignId = String(body.campaignId ?? "");
    const idempotencyKey = header(req, "idempotency-key");
    if (!UUID.test(campaignId)) throw new ApiError(400, "campaignId inválido");
    if (!UUID.test(idempotencyKey)) throw new ApiError(400, "Idempotency-Key inválida");

    const campaigns = await supabaseAdminRequest<any[]>(
      `campaigns?id=eq.${encodeURIComponent(campaignId)}&select=id,name,total_budget,funded,pay_mode,brands(user_id)&limit=1`,
    );
    const campaign = campaigns[0];
    if (!campaign) throw new ApiError(404, "campanha não encontrada");
    const ownerId = Array.isArray(campaign.brands) ? campaign.brands[0]?.user_id : campaign.brands?.user_id;
    if (ownerId !== user.id) throw new ApiError(403, "você não é dono desta campanha");
    if (campaign.pay_mode !== "escrow") throw new ApiError(409, "campanha split é paga por creator contratado");
    if (campaign.funded === true) throw new ApiError(409, "campanha já financiada");
    const expectedAmount = Math.round(Number(campaign.total_budget) * 100) / 100;
    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) throw new ApiError(409, "contrato financeiro inválido");

    const created = await supabaseAdminRequest<any[]>(
      "campaign_fundings?on_conflict=brand_user_id,idempotency_key",
      {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
        body: JSON.stringify({
          campaign_id: campaign.id,
          brand_user_id: user.id,
          expected_amount: expectedAmount,
          idempotency_key: idempotencyKey,
        }),
      },
    );
    let funding = created[0];
    if (!funding) {
      const existing = await supabaseAdminRequest<any[]>(
        `campaign_fundings?brand_user_id=eq.${encodeURIComponent(user.id)}&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=id,status,preference_id,checkout_url&limit=1`,
      );
      funding = existing[0];
      if (funding?.preference_id && funding?.checkout_url) {
        return res.status(200).json({ configured: true, preference_id: funding.preference_id, init_point: funding.checkout_url });
      }
    }
    if (!funding?.id) throw new ApiError(502, "não foi possível iniciar o financiamento");
    if (funding.status === "failed") {
      await supabaseAdminRequest(`campaign_fundings?id=eq.${encodeURIComponent(funding.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "pending" }),
      });
    }

    const appUrl = (process.env.APP_URL || "https://onlyshopbrasil.com.br").replace(/\/$/, "");
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        items: [{ title: String(campaign.name).slice(0, 120), quantity: 1, unit_price: expectedAmount, currency_id: "BRL" }],
        external_reference: `funding:${funding.id}`,
        statement_descriptor: "ONLYSHOP",
        notification_url: `${appUrl}/api/mp-webhook`,
        metadata: { funding_id: funding.id },
        back_urls: {
          success: `${appUrl}/brands?funding=${encodeURIComponent(funding.id)}`,
          pending: `${appUrl}/brands?funding=${encodeURIComponent(funding.id)}`,
          failure: `${appUrl}/brands?payment=failed`,
        },
        auto_return: "approved",
      }),
    });
    const preference = await mpResponse.json().catch(() => null);
    if (!mpResponse.ok || !preference?.id || !preference?.init_point) {
      await supabaseAdminRequest(`campaign_fundings?id=eq.${encodeURIComponent(funding.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "failed" }),
      });
      throw new ApiError(502, "Falha ao criar pagamento");
    }
    await supabaseAdminRequest(`campaign_fundings?id=eq.${encodeURIComponent(funding.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ preference_id: preference.id, checkout_url: preference.init_point }),
    });
    return res.status(200).json({ configured: true, preference_id: preference.id, init_point: preference.init_point });
  } catch (error) {
    return apiErrorResponse(error, res);
  }
}
