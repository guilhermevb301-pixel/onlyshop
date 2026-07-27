// O split do Mercado Pago só existe quando as credenciais estão no servidor.
// A sonda é feita uma vez por sessão e cacheada — enquanto estiver desligado,
// tudo continua no modelo antigo (escrow) sem nenhuma mudança de comportamento.
let cache: Promise<{ configured: boolean; live: boolean }> | null = null;

function probe() {
  if (!cache) {
    cache = fetch("/api/pay-affiliate")
      .then((r) => r.json())
      .then((j) => ({ configured: j?.configured === true, live: j?.live === true }))
      .catch(() => ({ configured: false, live: false }));
  }
  return cache;
}

// Split configurado: dá pra conectar o MP e pagar (aparece a UI).
export const splitEnabled = () => probe().then((p) => p.configured);
// Split "no ar": campanha NOVA já nasce split. Fica false no modo teste.
export const splitLive = () => probe().then((p) => p.live);
