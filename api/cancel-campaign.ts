import { ApiError, authenticateRequest } from "./_lib/auth";
import { apiErrorResponse, supabaseAdminRequest } from "./_lib/supabase";

export const config = { maxDuration: 30 };

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "use POST" });
  try {
    const user = await authenticateRequest(req);
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const campaignId = String(body.campaignId ?? "").trim();
    if (!campaignId) throw new ApiError(400, "campaignId ausente");

    const rows = await supabaseAdminRequest<any[]>(
      `campaigns?id=eq.${encodeURIComponent(campaignId)}&select=id,funded,brands(user_id)&limit=1`,
    );
    const campaign = rows[0];
    if (!campaign) throw new ApiError(404, "campanha não encontrada");
    const ownerId = Array.isArray(campaign.brands) ? campaign.brands[0]?.user_id : campaign.brands?.user_id;
    if (ownerId !== user.id) throw new ApiError(403, "você não é dono desta campanha");
    if (campaign.funded) {
      throw new ApiError(409, "Campanha paga não pode ser cancelada até o fluxo de estorno ser concluído pelo suporte");
    }

    await supabaseAdminRequest(`campaigns?id=eq.${encodeURIComponent(campaignId)}`, { method: "DELETE" });
    return res.status(200).json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, res);
  }
}
