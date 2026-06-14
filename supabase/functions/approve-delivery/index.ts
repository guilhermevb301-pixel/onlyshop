// =============================================================================
// approve-delivery — lojista aprova a entrega -> dispara o SPLIT 80/20.
//
// STUB PLUGÁVEL: já grava o ledger (payout 80% influencer + platform_fee 20%)
// via service_role e marca a candidatura como 'paid'. O repasse REAL ao
// influencer (transferência Mercado Pago) é o ponto a ligar com a chave.
// =============================================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const FEE_PCT = 20;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { application_id } = await req.json();
    if (!application_id) return json({ error: "application_id obrigatório" }, 400);

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ configured: false, error: "Supabase service role ausente (modo demo)." }, 200);
    const sb = createClient(url, key);

    // Busca a candidatura + a campanha (pra valor e influencer).
    const { data: app } = await sb.from("campaign_applications").select("*, campaign:campaigns(*)").eq("id", application_id).maybeSingle();
    if (!app) return json({ error: "candidatura não encontrada" }, 404);
    const reward = Number((app as any).campaign?.reward_amount || 0);
    const platformFee = reward * (FEE_PCT / 100);
    const influencerCut = reward - platformFee;

    // Ledger do split.
    await sb.from("platform_credits").insert([
      { user_id: (app as any).influencer_user_id, kind: "payout", amount: influencerCut, campaign_id: (app as any).campaign_id, status: "completed" },
      { user_id: (app as any).influencer_user_id, kind: "platform_fee", amount: -platformFee, campaign_id: (app as any).campaign_id, status: "completed" },
    ]);
    await sb.from("campaign_applications").update({ status: "paid", updated_at: new Date().toISOString() }).eq("id", application_id);

    // TODO Mercado Pago: transferência real de R$ influencerCut pro influencer (split/payout).
    return json({ success: true, influencer: influencerCut, platform: platformFee });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "erro" }, 500);
  }
});

function json(p: unknown, status = 200) {
  return new Response(JSON.stringify(p), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
