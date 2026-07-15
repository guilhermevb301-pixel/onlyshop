// Localização atual + histórico reusável (estilo Uber — pedido do Biel).
// 100% client-side. Mantém a chave/shape que o onboarding e o Mapa JÁ usam
// ("onlyshop_demo_location" = {lat,lon,city,state}) pra não quebrar nada, e
// adiciona um histórico com dedupe + cap 6 (LRU: mais recente no topo).

export interface GeoLike {
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
}
export interface LocationHistoryItem extends GeoLike {
  ts: number;
}

const CUR_KEY = "onlyshop_demo_location";
const HIST_KEY = "onlyshop_location_history";
const CAP = 6;

// Slot ATUAL. Lê o shape gravado {lat,lon,city,state} e devolve GeoLocation.
export function getCurrentLocation(): GeoLike | null {
  try {
    const raw = localStorage.getItem(CUR_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d?.lat == null || d?.lon == null) return null;
    return { latitude: d.lat, longitude: d.lon, city: d.city ?? undefined, state: d.state ?? undefined };
  } catch {
    return null;
  }
}

// Chave de dedupe: cidade/uf normalizados + lat/lon arredondados (~110m).
export function locationKey(l: { latitude?: number; longitude?: number; city?: string; state?: string }): string {
  const la = Math.round((l.latitude ?? 0) * 1000) / 1000;
  const lo = Math.round((l.longitude ?? 0) * 1000) / 1000;
  return `${(l.city || "").trim().toLowerCase()}|${(l.state || "").trim().toLowerCase()}|${la}|${lo}`;
}

export function getLocationHistory(): LocationHistoryItem[] {
  try {
    const r = localStorage.getItem(HIST_KEY);
    return r ? (JSON.parse(r) as LocationHistoryItem[]) : [];
  } catch {
    return [];
  }
}

// Grava o slot atual (shape compat) + empurra no histórico (LRU, dedupe, cap 6).
export function setCurrentLocation(geo: GeoLike): void {
  try {
    localStorage.setItem(
      CUR_KEY,
      JSON.stringify({ lat: geo.latitude, lon: geo.longitude, city: geo.city ?? null, state: geo.state ?? null })
    );
    const item: LocationHistoryItem = { ...geo, ts: Date.now() };
    const key = locationKey(item);
    const rest = getLocationHistory().filter((h) => locationKey(h) !== key);
    localStorage.setItem(HIST_KEY, JSON.stringify([item, ...rest].slice(0, CAP)));
  } catch {
    /* localStorage indisponível */
  }
}

export function removeFromHistory(key: string): void {
  try {
    const next = getLocationHistory().filter((h) => locationKey(h) !== key);
    localStorage.setItem(HIST_KEY, JSON.stringify(next));
  } catch {
    /* ignora */
  }
}
