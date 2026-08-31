import { ApiError, authenticateRequest } from "./_lib/auth";
import { CampaignInputError, deriveCampaignMoney } from "./_lib/money";
import { apiErrorResponse, supabaseAdminRequest } from "./_lib/supabase";

export const config = { maxDuration: 30 };

const text = (value: unknown, max: number): string | null => {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized.slice(0, max) : null;
};

const int = (value: unknown, min: number, max: number, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "use POST" });
  try {
    const user = await authenticateRequest(req);
    const input = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const money = deriveCampaignMoney(input, process.env.MP_SPLIT_LIVE === "true");

    const brands = await supabaseAdminRequest<Array<{ id: string }>>(
      `brands?user_id=eq.${encodeURIComponent(user.id)}&select=id&limit=1`,
    );
    const brandId = brands[0]?.id;
    if (!brandId) throw new ApiError(403, "crie sua marca antes da campanha");

    const payload = {
      brand_id: brandId,
      name: String(input.name).trim().slice(0, 120),
      description: text(input.description, 5_000),
      briefing: text(input.briefing, 10_000),
      reward_type: input.reward_type === "permuta" ? "permuta" : "per_video",
      reward_amount: money.rewardAmount,
      slots: money.slots,
      slots_filled: 0,
      target_city: text(input.target_city, 120),
      target_state: text(input.target_state, 2)?.toUpperCase() ?? null,
      target_gender: ["female", "male", "any"].includes(String(input.target_gender)) ? input.target_gender : "any",
      min_followers: int(input.min_followers, 0, 100_000_000, 0),
      deadline_hours: int(input.deadline_hours, 1, 2_160, 168),
      physical_item: text(input.physical_item, 500),
      territory_scope: ["rua", "bairro", "cidade", "zona"].includes(String(input.territory_scope)) ? input.territory_scope : "cidade",
      territory_name: text(input.territory_name, 160),
      territory_neighborhood: text(input.territory_neighborhood, 160),
      territory_street: text(input.territory_street, 200),
      platform_fee_pct: money.platformFeePct,
      total_budget: money.totalBudget,
      funded: money.funded,
      pay_mode: money.payMode,
      auto_approve: input.auto_approve === true,
      auto_accept: input.auto_accept === true,
      campaign_kind: money.campaignKind,
      phases: money.phases,
      status: "active",
    };
    const rows = await supabaseAdminRequest<any[]>("campaigns", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload),
    });
    if (!rows[0]) throw new ApiError(502, "Campanha não foi criada");
    return res.status(201).json(rows[0]);
  } catch (error) {
    if (error instanceof CampaignInputError) return res.status(400).json({ error: error.message });
    return apiErrorResponse(error, res);
  }
}
