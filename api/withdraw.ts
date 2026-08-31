import { ApiError, authenticateRequest } from "./_lib/auth";
import { encryptSensitiveValue } from "./_lib/crypto";
import { apiErrorResponse, supabaseAdminRequest } from "./_lib/supabase";

export const config = { maxDuration: 30 };
const MINIMUM = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PIX_TYPES = new Set(["cpf", "cnpj", "email", "phone", "random"]);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "use POST" });
  try {
    const user = await authenticateRequest(req);
    const encryptionKey = process.env.WITHDRAWAL_ENCRYPTION_KEY ?? "";
    if (!encryptionKey) throw new ApiError(503, "Saques temporariamente indisponíveis");
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const amount = Math.round(Number(body.amount) * 100) / 100;
    const pixKey = String(body.pixKey ?? "").trim();
    const pixKeyType = String(body.pixKeyType ?? "").toLowerCase();
    const rawIdempotency = req.headers?.["idempotency-key"];
    const idempotencyKey = Array.isArray(rawIdempotency) ? rawIdempotency[0] ?? "" : String(rawIdempotency ?? "");
    if (!Number.isFinite(amount) || amount < MINIMUM) throw new ApiError(400, `Saque mínimo é R$ ${MINIMUM}`);
    if (!PIX_TYPES.has(pixKeyType) || pixKey.length < 3 || pixKey.length > 180) throw new ApiError(400, "Chave PIX inválida");
    if (!UUID.test(idempotencyKey)) throw new ApiError(400, "Idempotency-Key inválida");

    const result = await supabaseAdminRequest<{ result: string; request_id?: string; balance?: number }>(
      "rpc/request_withdrawal_atomic",
      {
        method: "POST",
        body: JSON.stringify({
          _user_id: user.id,
          _amount: amount,
          _pix_key_type: pixKeyType,
          _pix_key_ciphertext: encryptSensitiveValue(pixKey, encryptionKey),
          _idempotency_key: idempotencyKey,
        }),
      },
    );
    if (result.result === "insufficient") throw new ApiError(400, `Saldo insuficiente (disponível R$ ${result.balance ?? 0})`);
    if (result.result === "invalid") throw new ApiError(400, "Pedido de saque inválido");
    if (!["ok", "already"].includes(result.result)) throw new ApiError(502, "Não foi possível registrar o saque");
    return res.status(200).json({ ok: true, request_id: result.request_id });
  } catch (error) {
    return apiErrorResponse(error, res);
  }
}
