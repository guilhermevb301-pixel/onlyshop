import { createHmac } from "node:crypto";
import { waitlistSchema } from "../../src/lib/waitlist.js";
import { supabaseAdminRequest } from "./supabase.js";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }
  try {
    let input: unknown;
    try { input = typeof req.body === "string" ? JSON.parse(req.body) : req.body; }
    catch { return res.status(400).json({ error: "Dados inválidos." }); }
    const parsed = waitlistSchema.safeParse(input);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const data = parsed.data;
    if (data.website) return res.status(200).json({ ok: true });
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secret) throw new Error("waitlist not configured");
    // Vercel supplies this header; do not trust the user-controlled x-forwarded-for.
    const ip = String(req.headers?.["x-vercel-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
    const hash = createHmac("sha256", secret).update(ip).digest("hex");
    const accepted = await supabaseAdminRequest<boolean>("rpc/submit_waitlist_lead", {
      method: "POST",
      body: JSON.stringify({ _name: data.name, _email: data.email, _whatsapp: data.whatsapp, _profile: data.profile, _ip_hash: hash }),
    });
    if (!accepted) {
      res.setHeader("Retry-After", "3600");
      return res.status(429).json({ error: "Muitas tentativas. Tente novamente em uma hora." });
    }
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(503).json({ error: "Não foi possível salvar agora. Tente novamente em instantes." });
  }
}
