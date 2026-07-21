// =============================================================================
// /api/withdraw — pedido de saque do influencer (PIX).
//
// Valida o saldo no banco (server-side) e registra o saque como PENDENTE no
// ledger (platform_credits, valor negativo). O repasse PIX em si é processado
// pela plataforma (ou, fase 2, automático via MP Marketplace). A chave PIX fica
// em provider_ref ("saque|tipo|chave") pra plataforma pagar.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// =============================================================================
import { randomUUID } from "crypto";
export const config = { maxDuration: 30 };

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WITHDRAW_MIN = 10;

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

    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "sem token" });
    const uRes = await fetch(`${SB_URL}/auth/v1/user`, {
      headers: { apikey: SB_KEY as string, Authorization: `Bearer ${token}` },
    });
    const u = await uRes.json();
    const userId = u?.id;
    if (!userId) return res.status(401).json({ error: "token inválido" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const amount = Math.round(Number(body.amount) * 100) / 100;
    const pixKey = String(body.pixKey || "").trim();
    const pixKeyType = String(body.pixKeyType || "cpf");
    if (!amount || amount < WITHDRAW_MIN) return res.status(400).json({ error: `Saque mínimo é R$ ${WITHDRAW_MIN}` });
    if (!pixKey) return res.status(400).json({ error: "Informe a chave PIX" });

    // Saldo real do usuário (ledger), excluindo taxa da plataforma e lançamentos falhos.
    const cRes = await sb(`platform_credits?user_id=eq.${encodeURIComponent(userId)}&select=amount,kind,status`);
    const credits = await cRes.json();
    const balance = (Array.isArray(credits) ? credits : [])
      // split_payout NÃO entra no saldo: esse dinheiro já caiu direto na conta
      // Mercado Pago do afiliado. Se contasse aqui, ele sacaria de novo via PIX
      // e a gente pagaria duas vezes pela mesma entrega.
      .filter((c: any) => c.kind !== "platform_fee" && c.kind !== "split_payout" && c.status !== "failed")
      .reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
    if (amount > balance) return res.status(400).json({ error: `Saldo insuficiente (disponível R$ ${Math.round(balance * 100) / 100})` });

    // Registra o saque como pendente (sai do saldo na hora).
    const ins = await sb("platform_credits", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        user_id: userId,
        kind: "withdrawal",
        amount: -amount,
        status: "pending",
        provider: "mercadopago",
        // ÚNICO por saque via UUID (Date.now colide no mesmo ms → o unique
        // (provider_ref,kind) engoliria o 2º saque). A chave PIX continua aqui pra
        // a plataforma pagar: split('|') = [saque, tipo, chave, uuid].
        provider_ref: `saque|${pixKeyType}|${pixKey}|${randomUUID()}`,
        created_at: new Date().toISOString(),
      }]),
    });
    // Checa que gravou de verdade (antes retornava ok:true mesmo se falhasse → saque
    // "aprovado" sem debitar o saldo).
    if (!ins.ok) {
      console.error("withdraw insert falhou:", (await ins.text()).slice(0, 140));
      return res.status(500).json({ error: "Não foi possível registrar o saque agora" });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("withdraw:", e);
    return res.status(500).json({ error: e instanceof Error ? e.message : "erro" });
  }
}
