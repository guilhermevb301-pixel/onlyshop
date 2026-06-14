// =============================================================================
// fund-campaign — lojista PAGA a campanha (PIX/cartão via Mercado Pago).
//
// STUB PLUGÁVEL: a lógica de split fica pronta; só liga quando houver
// MERCADOPAGO_ACCESS_TOKEN. Sem a chave, retorna {configured:false} e o
// front segue no modo demo (credita localmente, sem mover dinheiro real).
//
// Fluxo real (quando ligar):
//   1) cria preferência de pagamento (PIX/cartão) com external_reference=campaign_id
//   2) webhook do Mercado Pago confirma -> marca campaigns.funded=true
//      + insere platform_credits(kind='campaign_hold') (escrow da plataforma)
// =============================================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const MP_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    const { campaign_id, amount, title } = await req.json();

    if (!MP_TOKEN) {
      return json({ configured: false, error: "Mercado Pago não configurado (modo demo)." }, 200);
    }
    if (!campaign_id || !amount) return json({ error: "campaign_id e amount obrigatórios" }, 400);

    // Cria preferência de pagamento (PIX + cartão).
    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${MP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ title: title || "Campanha OnlyShop", quantity: 1, unit_price: Number(amount), currency_id: "BRL" }],
        external_reference: campaign_id,
        payment_methods: { excluded_payment_types: [] },
        // back_urls / notification_url: configurar com o domínio em produção
      }),
    });
    const data = await res.json();
    if (!res.ok) return json({ error: data?.message || "Falha ao criar pagamento" }, 400);
    return json({ configured: true, preference_id: data.id, init_point: data.init_point });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "erro" }, 500);
  }
});

function json(p: unknown, status = 200) {
  return new Response(JSON.stringify(p), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
