function headers(token: string, idempotencyKey: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "Idempotency-Key": idempotencyKey,
  };
}

export function buildFundingRequest(campaignId: string, token: string, idempotencyKey: string): RequestInit {
  return {
    method: "POST",
    headers: headers(token, idempotencyKey),
    body: JSON.stringify({ campaignId }),
  };
}

export function buildWithdrawalRequest(
  body: { amount: number; pixKey: string; pixKeyType: string },
  token: string,
  idempotencyKey: string,
): RequestInit {
  return {
    method: "POST",
    headers: headers(token, idempotencyKey),
    body: JSON.stringify(body),
  };
}
