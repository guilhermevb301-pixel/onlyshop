import { ApiError } from "./auth";

export async function claimApiUsage(req: any, operation: string): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = String(req.headers?.authorization || "");
  if (!url || !key || !authorization) throw new ApiError(500, "Quota não configurada");
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/claim_my_api_usage`, {
    method: "POST",
    headers: { apikey: key, Authorization: authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ _operation: operation }),
  });
  if (!response.ok) throw new ApiError(502, "Não foi possível reservar o uso");
  if ((await response.json()) !== true) throw new ApiError(429, "Limite diário atingido");
}
