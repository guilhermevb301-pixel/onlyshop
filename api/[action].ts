import createCampaign from "./_lib/create-campaign.js";
import waitlist from "./_lib/waitlist.js";

export const config = { maxDuration: 30 };

// Keep both public URLs while staying within the Hobby function limit.
export default function handler(req: any, res: any) {
  if (req.query?.action === "create-campaign") return createCampaign(req, res);
  if (req.query?.action === "waitlist") return waitlist(req, res);
  return res.status(404).json({ error: "Rota não encontrada." });
}
