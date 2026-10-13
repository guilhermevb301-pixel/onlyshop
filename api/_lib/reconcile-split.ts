import { ApiError } from "./auth.js";
import { supabaseAdminRequest } from "./supabase.js";

export async function reconcileSplit(split: { id: string; gross: number }, sellerToken: string, sellerId: string) {
  const reference = `split:${split.id}`;
  const headers = { Authorization: `Bearer ${sellerToken}` };
  const searchResponse = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(reference)}&sort=date_created&criteria=desc&limit=20`, { headers });
  if (!searchResponse.ok) throw new ApiError(502, "Não foi possível consultar o split");
  const search = await searchResponse.json();
  for (const candidate of search.results ?? []) {
    if (candidate.status !== "approved") continue;
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(candidate.id))}`, { headers });
    if (!response.ok) throw new ApiError(502, "Não foi possível verificar o split");
    const payment = await response.json();
    if (payment.status !== "approved" || payment.external_reference !== reference || payment.currency_id !== "BRL"
      || String(payment.collector_id) !== sellerId || Number(payment.transaction_amount_refunded ?? 0) !== 0
      || !Number.isFinite(Number(payment.transaction_amount)) || Math.abs(Number(payment.transaction_amount) - Number(split.gross)) > 0.001) continue;
    const result = await supabaseAdminRequest<{ result: string }>("rpc/confirm_split_payment_atomic", {
      method: "POST", body: JSON.stringify({ _split_id: split.id, _payment_id: String(payment.id) }),
    });
    if (["ok", "already"].includes(result.result)) return true;
    throw new ApiError(409, "Split precisa de revisão antes de confirmar");
  }
  return false;
}
