export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export interface AuthenticatedUser {
  id: string;
  email: string | null;
}

type RequestLike = { headers?: Record<string, string | string[] | undefined> };
type FetchLike = typeof fetch;

interface AuthOptions {
  supabaseUrl?: string;
  serviceRoleKey?: string;
  fetchImpl?: FetchLike;
}

function firstHeader(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export async function authenticateRequest(
  req: RequestLike,
  options: AuthOptions = {},
): Promise<AuthenticatedUser> {
  const supabaseUrl = options.supabaseUrl ?? process.env.SUPABASE_URL ?? "";
  const serviceRoleKey = options.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new ApiError(500, "Supabase não configurado");
  }

  const authorization = firstHeader(req.headers?.authorization);
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) throw new ApiError(401, "sem token");

  const response = await fetchImpl(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${match[1]}`,
    },
  });
  const body = await response.json().catch(() => null) as { id?: unknown; email?: unknown } | null;
  if (!response.ok || typeof body?.id !== "string" || !body.id) {
    throw new ApiError(401, "token inválido");
  }

  return {
    id: body.id,
    email: typeof body.email === "string" ? body.email : null,
  };
}
