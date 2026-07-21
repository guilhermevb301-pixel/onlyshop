// O split do Mercado Pago só existe quando as credenciais estão no servidor.
// A sonda é feita uma vez por sessão e cacheada — enquanto estiver desligado,
// tudo continua no modelo antigo (escrow) sem nenhuma mudança de comportamento.
let cache: Promise<boolean> | null = null;

export function splitEnabled(): Promise<boolean> {
  if (!cache) {
    cache = fetch("/api/pay-affiliate")
      .then((r) => r.json())
      .then((j) => j?.configured === true)
      .catch(() => false);
  }
  return cache;
}
