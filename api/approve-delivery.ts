// =============================================================================
// /api/approve-delivery — aprova a entrega e credita o influencer (automático).
//
// O influencer recebe o valor CHEIO do reward (a taxa de 20% foi cobrada da marca,
// em cima — computeBudget). Vira saldo dele em platform_credits kind=payout.
// Autoriza: o DONO da campanha (via JWT) OU o próprio influencer quando a campanha
// é auto_approve + funded + delivered + tem comprovante (opt-in da marca). Idempotente.
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
      `campaign_applications?id=eq.${encodeURIComponent(applicationId)}&select=id,status,influencer_user_id,campaign_id,proofs,delivery_url,campaigns(reward_amount,auto_approve,funded,brands(user_id))`
    );
    const rows = await appRes.json();
    const app = Array.isArray(rows) ? rows[0] : null;
    if (!app) return res.status(404).json({ error: "candidatura não encontrada" });

    const ownerId = app.campaigns?.brands?.user_id;
    const isOwner = ownerId === callerId;
    // Auto-aprovação (opt-in da marca): o influencer só pode DISPARAR a aprovação se
    // a campanha for auto_approve E estiver PAGA (funded — dinheiro já retido) E o
    // status for delivered E ele for o dono da candidatura E tiver comprovante.
    // Reusa o MESMO caminho (dup-check + status abaixo impedem pagar duas vezes).
    const proofLinks = Array.isArray(app.proofs?.links) ? app.proofs.links.filter(Boolean) : [];
    const hasProof = proofLinks.length > 0 || !!app.delivery_url;
    const isSelfAuto =
      app.campaigns?.auto_approve === true &&
      app.campaigns?.funded === true &&
      app.status === "delivered" &&
      callerId === app.influencer_user_id &&
      hasProof;
    if (!isOwner && !isSelfAuto) {
      return res.status(403).json({ error: "não autorizado a aprovar esta entrega" });
    }

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

    // 7) Pontos de território (dono da rua/bairro/cidade). BEST-EFFORT; a RPC é
    // idempotente (trava por territory_awarded_at) e nunca pode derrubar o pagamento.
    try {
      await sb("rpc/award_territory", {
        method: "POST",
        body: JSON.stringify({ _application_id: applicationId, _points: 10 }),
      });
    } catch (tErr) {
      console.error("award_territory failed (non-fatal):", tErr);
    }

    return res.status(200).json({ ok: true, influencer_share: influencerShare });
  } catch (e) {
    console.error("approve-delivery:", e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "erro" });
  }
}
