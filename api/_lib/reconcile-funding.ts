import { ApiError } from "./auth.js";
import { supabaseAdminRequest } from "./supabase.js";
import { getMarketplaceToken } from "./marketplace-token.js";

export async function reconcileFunding(campaignId: string, ownerId: string) {
  const token = await getMarketplaceToken();
  const rows = await supabaseAdminRequest<Array<{ id: string; expected_amount: number }>>(
    `campaign_fundings?campaign_id=eq.${encodeURIComponent(campaignId)}&brand_user_id=eq.${encodeURIComponent(ownerId)}&status=eq.pending&select=id,expected_amount&order=created_at.desc&limit=5`,
  );
  for (const funding of rows) {
    const reference = `funding:${funding.id}`;
    const response = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(reference)}&sort=date_created&criteria=desc&limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new ApiError(502, "Não foi possível consultar a confirmação do pagamento");
    const search = await response.json();
    for (const candidate of search.results ?? []) {
      if (candidate.status !== "approved") continue;
      const detailResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(candidate.id))}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!detailResponse.ok) throw new ApiError(502, "Não foi possível verificar o pagamento");
      const payment = await detailResponse.json();
      if (payment.status !== "approved" || payment.external_reference !== reference
        || payment.currency_id !== "BRL" || Number(payment.transaction_amount_refunded ?? 0) !== 0
        || Math.abs(Number(payment.transaction_amount) - Number(funding.expected_amount)) > 0.001
        || !Number.isFinite(Number(payment.transaction_amount))
        || (payment.metadata?.funding_id && payment.metadata.funding_id !== funding.id)) continue;
      const result = await supabaseAdminRequest<string>("rpc/confirm_campaign_funding", {
        method: "POST", body: JSON.stringify({ _funding_id: funding.id, _payment_id: String(payment.id), _paid_amount: Number(payment.transaction_amount) }),
      });
      if (result === "ok" || result === "already") return true;
      throw new ApiError(409, "Pagamento precisa de revisão antes de confirmar");
    }
  }
  return false;
}
