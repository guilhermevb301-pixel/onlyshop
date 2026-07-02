// =============================================================================
// /api/fund-campaign — pagamento REAL da campanha via Mercado Pago (Checkout Pro).
//
// O lojista paga a campanha (PIX/cartão) -> dinheiro cai na conta Mercado Pago
// da plataforma. Retorna o link (init_point) pra onde o front redireciona.
//
// Chave (Vercel env): MERCADOPAGO_ACCESS_TOKEN
//   SE AUSENTE -> { configured:false } e o front segue no modo demo.
//
// PENDENTE (precisa Supabase): persistir "funded", webhook de confirmação, e o
// split/repasse automático 80/20 pro influencer (Mercado Pago Marketplace).
// Por ora o dinheiro fica na conta da plataforma e o repasse é manual.
// =============================================================================
export const config = { maxDuration: 30 };

const APP_URL = "https://onlyshopbrasil.com.br";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "use POST" });
  try {
    const TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!TOKEN) return res.status(200).json({ configured: false, error: "Mercado Pago não configurado (modo demo)." });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const title = String(body.title || "Campanha OnlyShop").slice(0, 120);
    const amount = Math.round(Number(body.amount) * 100) / 100;
    const campaignId = String(body.campaignId || "novo");
    const brandUserId = String(body.brandUserId || ""); // dono da loja (pra creditar o hold no webhook)
    if (!amount || amount <= 0) return res.status(400).json({ error: "amount inválido" });

    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ title, quantity: 1, unit_price: amount, currency_id: "BRL" }],
        external_reference: campaignId,
        statement_descriptor: "ONLYSHOP",
        // Webhook do Mercado Pago: confirma o pagamento server-side e marca a campanha
        // como paga/no ar (mesmo se o lojista fechar a aba).
        notification_url: `${APP_URL}/api/mp-webhook`,
        metadata: { campaign_id: campaignId, brand_user_id: brandUserId, amount },
        back_urls: {
          success: `${APP_URL}/brands?paid=${encodeURIComponent(campaignId)}`,
          pending: `${APP_URL}/brands?paid=${encodeURIComponent(campaignId)}`,
          failure: `${APP_URL}/checkout?failed=1`,
        },
        auto_return: "approved",
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(400).json({ error: data?.message || "Falha ao criar pagamento", details: data });
    return res.status(200).json({ configured: true, preference_id: data.id, init_point: data.init_point });
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "erro" });
  }
}
