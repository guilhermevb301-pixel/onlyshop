// =============================================================================
// /api/approve-delivery — aprova a entrega e faz o SPLIT 80/20 (automático).
//
// O lojista aprova uma entrega -> 80% do reward vira saldo do influencer
// (platform_credits kind=payout); os 20% ficam com a plataforma (na conta MP).
// Verifica que quem chama é DONO da campanha (via JWT). Idempotente.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// =============================================================================
export const config = { maxDuration: 30 };

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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "use POST" });
  try {
    if (!SB_URL || !SB_KEY) return res.status(500).json({ error: "Supabase não configurado" });

    // 1) Quem está chamando? (valida o JWT do usuário)
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "sem token" });
    const uRes = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { apikey: SB_KEY as string, Authorization: `Bearer ${token}` },
    });
    const u = await uRes.json();
    const callerId = u?.id;
    if (!callerId) return res.status(401).json({ error: "token inválido" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const applicationId = String(body.applicationId || "");
    if (!applicationId) return res.status(400).json({ error: "applicationId ausente" });

    // 2) Busca a candidatura + reward + dono da campanha (pra autorizar).
    const appRes = await sb(
      `campaign_applications?id=eq.${encodeURIComponent(applicationId)}&select=id,status,influencer_user_id,campaign_id,campaigns(reward_amount,brands(user_id))`
    );
    const rows = await appRes.json();
    const app = Array.isArray(rows) ? rows[0] : null;
    if (!app) return res.status(404).json({ error: "candidatura não encontrada" });

    const ownerId = app.campaigns?.brands?.user_id;
    if (ownerId !== callerId) return res.status(403).json({ error: "só o dono da campanha pode aprovar" });

    // 3) Idempotência: já aprovado/pago? não credita de novo.
    if (app.status === "approved" || app.status === "paid") {
      return res.status(200).json({ ok: true, already: true });
    }
    const ref = `approve-${applicationId}`;
    const dup = await (await sb(`platform_credits?provider_ref=eq.${encodeURIComponent(ref)}&select=id&limit=1`)).json();
    if (Array.isArray(dup) && dup.length) return res.status(200).json({ ok: true, already: true });

    const reward = Number(app.campaigns?.reward_amount || 0);
    // Influencer recebe o valor CHEIO da campanha — a taxa da plataforma foi cobrada
    // da marca, em cima (computeBudget). Não desconta nada do influencer.
    const influencerShare = Math.round(reward * 100) / 100;

    // 4) Aprova a entrega.
    await sb(`campaign_applications?id=eq.${encodeURIComponent(applicationId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "approved", updated_at: new Date().toISOString() }),
    });

    // 5) Credita 80% pro influencer (saldo real na carteira dele).
    if (app.influencer_user_id && influencerShare > 0) {
      await sb("platform_credits", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify([{
          user_id: app.influencer_user_id,
          kind: "payout",
          amount: influencerShare,
          campaign_id: app.campaign_id,
          status: "completed",
          provider: "mercadopago",
          provider_ref: ref,
          created_at: new Date().toISOString(),
        }]),
      });
    }

    // 6) XP pro influencer (entrega aprovada). BEST-EFFORT — try/catch isolado,
    // roda DEPOIS do ledger/status já persistidos e NUNCA altera o 200 do pagamento.
    // Vale pra paga e permuta (a aprovação sempre acontece acima).
    try {
      await sb("rpc/add_gamification_points", {
        method: "POST",
        body: JSON.stringify({
          _user_id: app.influencer_user_id,
          _action: "campaign_approved",
          _points: 80,
          _metadata: { application_id: applicationId, campaign_id: app.campaign_id },
        }),
      });
    } catch (xpErr) {
      console.error("xp grant failed (non-fatal):", xpErr);
    }

    return res.status(200).json({ ok: true, influencer_share: influencerShare });
  } catch (e) {
    console.error("approve-delivery:", e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "erro" });
  }
}
