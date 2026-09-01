import { ApiError, authenticateRequest } from "./_lib/auth.js";
import { apiErrorResponse, supabaseAdminRequest } from "./_lib/supabase.js";

export const config = { maxDuration: 30 };

const resultMap: Record<string, [number, string]> = {
  not_found: [404, "candidatura não encontrada"],
  not_process: [400, "campanha não é do tipo processo"],
  not_funded: [403, "campanha ainda não está paga"],
  split: [409, "esta campanha paga direto na conta do creator"],
  forbidden: [403, "não autorizado a pagar esta etapa"],
  not_accepted: [403, "perfil ainda não aprovado pela marca"],
  index: [409, "etapa fora do limite"],
  proof: [403, "sem comprovante desta etapa"],
  needs_brand: [403, "a marca precisa aprovar esta etapa"],
  cap_campaign: [409, "excede o valor financiado da campanha"],
  cap_app: [409, "excede o teto do creator nesta campanha"],
  phase: [400, "phase inválida"],
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "use POST" });
  try {
    const user = await authenticateRequest(req);
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const applicationId = String(body.applicationId ?? "").trim();
    const phase = String(body.phase ?? "").trim();
    const index = Math.max(0, Math.floor(Number(body.index ?? 0)));
    if (!applicationId) throw new ApiError(400, "applicationId ausente");
    if (!["connection", "video", "live"].includes(phase)) throw new ApiError(400, "phase inválida");

    const result = await supabaseAdminRequest<{ result: string; amount?: number }>(
      "rpc/process_payout_atomic",
      {
        method: "POST",
        body: JSON.stringify({
          _application_id: applicationId,
          _caller_id: user.id,
          _phase: phase,
          _index: index,
        }),
      },
    );
    if (result.result === "already") {
      return res.status(200).json({ ok: true, already: true, phase, amount: result.amount ?? 0 });
    }
    if (result.result !== "ok") {
      const mapped = resultMap[result.result] ?? [502, "não foi possível creditar a etapa"];
      throw new ApiError(mapped[0], mapped[1]);
    }
    return res.status(200).json({ ok: true, phase, amount: result.amount ?? 0 });
  } catch (error) {
    return apiErrorResponse(error, res);
  }
}
