import { ApiError, authenticateRequest } from "./_lib/auth";
import { apiErrorResponse, supabaseAdminRequest } from "./_lib/supabase";

export const config = { maxDuration: 30 };

const statusMap: Record<string, [number, string]> = {
  not_found: [404, "candidatura não encontrada"],
  forbidden: [403, "não autorizado a aprovar esta entrega"],
  not_delivered: [409, "a entrega ainda não foi enviada"],
  split: [409, "esta campanha paga direto na conta do creator"],
  not_funded: [403, "campanha ainda não está paga"],
  process: [409, "campanha por processo deve usar o pagamento por etapa"],
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "use POST" });
  try {
    const user = await authenticateRequest(req);
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const applicationId = String(body.applicationId ?? "").trim();
    if (!applicationId) throw new ApiError(400, "applicationId ausente");

    const result = await supabaseAdminRequest<{
      result: string;
      influencer_share?: number;
      influencer_user_id?: string;
      campaign_id?: string;
    }>(
      "rpc/approve_delivery_atomic",
      {
        method: "POST",
        body: JSON.stringify({ _application_id: applicationId, _caller_id: user.id }),
      },
    );
    if (result.result === "already") return res.status(200).json({ ok: true, already: true });
    if (result.result !== "ok") {
      const mapped = statusMap[result.result] ?? [502, "não foi possível aprovar a entrega"];
      throw new ApiError(mapped[0], mapped[1]);
    }

    // Gamificação não participa do dinheiro. Falha aqui nunca reverte nem duplica payout.
    await Promise.allSettled([
      supabaseAdminRequest("rpc/add_gamification_points", {
        method: "POST",
        body: JSON.stringify({
          _user_id: result.influencer_user_id,
          _action: "campaign_approved",
          _points: 80,
          _metadata: { application_id: applicationId, campaign_id: result.campaign_id },
        }),
      }),
      supabaseAdminRequest("rpc/award_territory", {
        method: "POST",
        body: JSON.stringify({ _application_id: applicationId, _points: 10 }),
      }),
    ]);
    return res.status(200).json({ ok: true, influencer_share: result.influencer_share ?? 0 });
  } catch (error) {
    return apiErrorResponse(error, res);
  }
}
