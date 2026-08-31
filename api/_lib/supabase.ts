import { ApiError } from "./auth";

export interface SupabaseAdminOptions {
  supabaseUrl?: string;
  serviceRoleKey?: string;
  fetchImpl?: typeof fetch;
}

export async function supabaseAdminRequest<T = unknown>(
  path: string,
  init: RequestInit = {},
  options: SupabaseAdminOptions = {},
): Promise<T> {
  const supabaseUrl = options.supabaseUrl ?? process.env.SUPABASE_URL ?? "";
  const serviceRoleKey = options.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const fetchImpl = options.fetchImpl ?? fetch;
  if (!supabaseUrl || !serviceRoleKey) throw new ApiError(500, "Supabase não configurado");

  const response = await fetchImpl(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("supabase admin request failed", response.status, path, body.slice(0, 300));
    throw new ApiError(502, "Falha ao persistir dados");
  }
  if (response.status === 204) return undefined as T;
  const body = await response.text();
  return (body ? JSON.parse(body) : undefined) as T;
}

export function apiErrorResponse(error: unknown, res: any) {
  if (error instanceof ApiError) return res.status(error.status).json({ error: error.message });
  console.error("api error", error);
  return res.status(500).json({ error: "Erro interno" });
}
