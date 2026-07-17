// =============================================================================
// /api/payout-process — paga o afiliado por ETAPA no modelo "Ganhe no Processo".
//
// phase: connection (R$20 ao aceitar) | video (R$2 × até 10) | live (R$10 × até 7).
// Um endpoint param-driven, clonando o esqueleto SEGURO de approve-delivery.ts.
// Trava, EM TODOS os ramos:
//   - GATE: campaign_kind==='process' E funded===true (dinheiro já retido no hold).
//   - AUTORIZAÇÃO: dono da campanha OU o próprio influencer da candidatura.
//   - COMPROVANTE: vídeo/live exigem o proof da etapa (conexão dispensa — é o aceite).
//   - IDEMPOTÊNCIA: provider_ref único por etapa (connect-{app} / video-{app}-{n} /
//     live-{app}-{d}) + unique (provider_ref,kind) no banco (corrida vira already:true).
//   - CAP: index dentro do max da fase E soma dos payouts da campanha ≤ |campaign_hold|
//     (nunca paga além do que a marca financiou).
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// =============================================================================
export const config = { maxDuration: 30 };

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEFAULTS = { connection: { brand: 25, affiliate: 20 }, video: { amount: 2, max: 10 }, live: { amount: 10, max: 7 } };

function sb(path: string, opts: any = {}) {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SB_KEY as string, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
}

// Quantos comprovantes de cada fase o afiliado já enviou (lê os dois shapes possíveis).
function proofCount(proofs: any, phase: string): number {
  if (!proofs) return 0;
  if (phase === "video") return Array.isArray(proofs.videos) ? proofs.videos.filter(Boolean).length : 0;
  if (phase === "live") return Array.isArray(proofs.lives) ? proofs.lives.filter(Boolean).length : 0;
  return 0;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "use POST" });
  try {
    if (!SB_URL || !SB_KEY) return res.status(500).json({ error: "Supabase não configurado" });

    // 1) Quem chama (JWT).
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "sem token" });
    const u = await (await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_KEY as string, Authorization: `Bearer ${token}` } })).json();
    const callerId = u?.id;
    if (!callerId) return res.status(401).json({ error: "token inválido" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const applicationId = String(body.applicationId || "");
    const phase = String(body.phase || "");
    const index = Math.floor(Number(body.index || 0));
    if (!applicationId) return res.status(400).json({ error: "applicationId ausente" });
    if (!["connection", "video", "live"].includes(phase)) return res.status(400).json({ error: "phase inválida" });

    // 2) Candidatura + campanha (N+1, sem embed inseguro — mas aqui service_role resolve o embed).
    const rows = await (await sb(`campaign_applications?id=eq.${encodeURIComponent(applicationId)}&select=id,status,influencer_user_id,campaign_id,proofs,campaigns(campaign_kind,funded,auto_approve,phases,brands(user_id))`)).json();
    const app = Array.isArray(rows) ? rows[0] : null;
    if (!app) return res.status(404).json({ error: "candidatura não encontrada" });
    const camp = app.campaigns;

    // 3) GATE: só campanha de processo E financiada.
    if (camp?.campaign_kind !== "process") return res.status(400).json({ error: "campanha não é do tipo processo" });
    if (camp?.funded !== true) return res.status(403).json({ error: "campanha ainda não está paga" });

    // 4) AUTORIZAÇÃO: dono OU o próprio influencer.
    const ownerId = camp?.brands?.user_id;
    const isOwner = ownerId === callerId;
    const isSelf = callerId === app.influencer_user_id;
    if (!isOwner && !isSelf) return res.status(403).json({ error: "não autorizado a pagar esta etapa" });

    // 5) Valor + ref + comprovante + limite da fase (config no BANCO, nunca no body).
    const phases = camp.phases && camp.phases.connection ? camp.phases : DEFAULTS;
    let amount = 0;
    let ref = "";
    if (phase === "connection") {
      amount = Number(phases.connection.affiliate);
      ref = `connect-${applicationId}`;
    } else if (phase === "video") {
      const max = Number(phases.video.max);
      if (!(index >= 1 && index <= max)) return res.status(409).json({ error: `vídeo fora do limite (1..${max})` });
      if (proofCount(app.proofs, "video") < index) return res.status(403).json({ error: "sem comprovante deste vídeo" });
      amount = Number(phases.video.amount);
      ref = `video-${applicationId}-${index}`;
    } else {
      const max = Number(phases.live.max);
      if (!(index >= 1 && index <= max)) return res.status(409).json({ error: `dia fora do limite (1..${max})` });
      if (proofCount(app.proofs, "live") < index) return res.status(403).json({ error: "sem comprovante deste dia de live" });
      amount = Number(phases.live.amount);
      ref = `live-${applicationId}-${index}`;
    }
    if (!(amount > 0)) return res.status(400).json({ error: "valor da etapa inválido" });

    // FRAUDE FECHADA: o comprovante de vídeo/live é escrito pelo próprio afiliado —
    // não pode ser a única trava. Então vídeo/live só pagam pela MARCA (isOwner) OU
    // quando a marca ligou auto_approve (opt-in de confiança). Conexão é o aceite em
    // si (sem fraude) e continua liberada pra self||owner com funded.
    if ((phase === "video" || phase === "live") && isSelf && !isOwner && camp?.auto_approve !== true) {
      return res.status(403).json({ error: "a marca precisa aprovar esta etapa" });
    }

    // 6-8) Crédito ATÔMICO via RPC: advisory lock por campanha + idempotência + CAP do
    // hold + CAP por candidatura (110/vaga), tudo numa transação. Fecha a corrida do
    // read-then-write (2 refs distintos em paralelo não estouram mais o hold).
    const cid = app.campaign_id;
    const rpc = await sb("rpc/process_payout", {
      method: "POST",
      body: JSON.stringify({ _app_id: applicationId, _campaign_id: cid, _user_id: app.influencer_user_id, _ref: ref, _amount: amount }),
    });
    if (!rpc.ok) throw new Error((await rpc.text()).slice(0, 140));
    const result = await rpc.json(); // 'ok' | 'already' | 'cap_campaign' | 'cap_app'
    if (result === "already") return res.status(200).json({ ok: true, already: true });
    if (result === "cap_campaign") return res.status(409).json({ error: "excede o valor financiado da campanha" });
    if (result === "cap_app") return res.status(409).json({ error: "excede o teto do afiliado nesta campanha" });
    if (result !== "ok") return res.status(409).json({ error: "não foi possível creditar" });

    // 9) Contador de progresso (server-truth p/ a UI). Best-effort.
    try {
      if (phase === "connection") {
        await sb(`campaign_applications?id=eq.${encodeURIComponent(applicationId)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ connection_paid_at: new Date().toISOString() }) });
      } else {
        const col = phase === "video" ? "videos_paid" : "lives_paid";
        await sb(`campaign_applications?id=eq.${encodeURIComponent(applicationId)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ [col]: index }) });
      }
    } catch (e) { console.error("progress counter (non-fatal):", e); }

    // 10) Repasse ao indicador (5% da receita da plataforma na conexão). BEST-EFFORT,
    // registrado em referral_earnings (ledger de indicação, separado do saldo real).
    if (phase === "connection") {
      try {
        const prof = await (await sb(`profiles?user_id=eq.${encodeURIComponent(app.influencer_user_id)}&select=referred_by`)).json();
        const refBy = Array.isArray(prof) && prof[0]?.referred_by;
        const share = Math.round(Number(phases.connection.brand) * 0.05 * 100) / 100; // 5% do que a marca pagou (R$25 → R$1,25)
        if (refBy && share > 0) {
          await sb("referral_earnings", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify([{ earner_user_id: refBy, source_user_id: app.influencer_user_id, amount: share, source_amount: Number(phases.connection.brand), kind: "subnetwork", status: "completed", provider_ref: `connect-ref-${applicationId}` }]) });
        }
      } catch (e) { console.error("referral share (non-fatal):", e); }
    }

    return res.status(200).json({ ok: true, phase, amount });
  } catch (e) {
    console.error("payout-process:", e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "erro" });
  }
}
