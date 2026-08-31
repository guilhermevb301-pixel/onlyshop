// =============================================================================
// /api/trends — Em Alta no TikTok (Vercel Serverless Function)
//
// Puxa o que está bombando no TikTok (Creative Center) via Apify — sem cookie,
// sem API oficial de shopping:
//   type="hashtags"  → hashtags em alta   (actor automation-lab)
//   type="creatives" → vídeos em alta     (actor automation-lab)
//   type="products"  → produtos do Shop   (actor burbn — pode vir vazio)
//
// Chave (Vercel env var): APIFY_TOKEN
//   SE AUSENTE → retorna { items: [], demo: true } e o front mostra exemplos.
//
// Cache: a resposta é cacheada no CDN da Vercel por 6h (s-maxage). Assim só a
// 1ª chamada (ou o cron diário) roda o Apify; o resto vem instantâneo do cache.
// =============================================================================

// Apify run-sync pode levar ~30-60s. Sobe o limite da função (máx Hobby).
export const config = { maxDuration: 60 };

const ACTOR_TRENDS = "automation-lab~tiktok-trends-scraper"; // hashtags + vídeos
const ACTOR_PRODUCTS = "burbn~tiktok-trending-products-scraper"; // produtos do Shop

type TrendType = "products" | "hashtags" | "creatives";

async function runApify(actor: string, input: unknown): Promise<any[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return [];
  const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Apify ${actor} falhou (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

// ---- normalizadores: formato cru do Apify → formato da tela ----------------
function normHashtags(items: any[]) {
  return items
    .filter((it) => it && (it.name || it.hashtagName))
    .map((it, i) => ({
      rank: it.rank ?? i + 1,
      name: String(it.name || it.hashtagName || "").replace(/^#/, ""),
      views: Number(it.videoViews ?? it.views ?? 0),
      posts: Number(it.publishedVideoCount ?? it.posts ?? 0),
      trend: it.trend || "stable", // up | down | stable
    }));
}

function normCreatives(items: any[]) {
  return items
    .filter((it) => it && (it.videoUrl || it.videoId))
    .map((it, i) => ({
      rank: it.rank ?? i + 1,
      title: it.videoDesc || it.name || "Vídeo em alta",
      author: it.authorName || it.authorHandle || "",
      handle: (it.authorHandle || "").replace(/^@/, ""),
      views: Number(it.playCount ?? 0),
      likes: Number(it.likeCountVideo ?? it.likeCount ?? 0),
      cover: it.videoCoverUrl || "",
      url: it.videoUrl || "",
      sound: it.soundName || "",
    }));
}

function normProducts(items: any[]) {
  return items
    .filter(Boolean)
    .map((it, i) => ({
      rank: it.rank ?? i + 1,
      name: it.title || it.name || it.productName || "Produto",
      category: it.categoryName || it.category || it.firstEcomCategory || "—",
      growth: Math.round(Number(it.postChange ?? it.post_change ?? it.growth ?? 0)),
      posts: Number(it.post ?? it.postCount ?? 0),
    }));
}


const _SB_URL = process.env.SUPABASE_URL;
const _SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Endpoint PAGO (provedor externo cobra por chamada). Sem exigir login, qualquer
// um na internet dispara e queima o crédito da conta. Falha fechado de propósito.
async function exigeLogin(req: any, res: any): Promise<boolean> {
  const token = String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token || !_SB_URL || !_SB_KEY) { res.status(401).json({ error: "faça login para usar" }); return false; }
  try {
    const u = await (await fetch(`${_SB_URL}/auth/v1/user`, { headers: { apikey: _SB_KEY, Authorization: `Bearer ${token}` } })).json();
    if (!u?.id) { res.status(401).json({ error: "sessão inválida" }); return false; }
    return true;
  } catch { res.status(401).json({ error: "não foi possível validar a sessão" }); return false; }
}

export default async function handler(req: any, res: any) {
  if (!(await exigeLogin(req, res))) return;
  try {
    const q = req.query || {};
    const type: TrendType = (["products", "hashtags", "creatives"].includes(q.type) ? q.type : "products");
    const country = String(q.country || "BR").toUpperCase();
    const period = [1, 7, 30].includes(Number(q.period)) ? Number(q.period) : 7;
    const limit = Math.min(Number(q.limit) || 20, 30);

    if (!process.env.APIFY_TOKEN) {
      return res.status(200).json({ items: [], demo: true, reason: "no_token" });
    }

    // hashtags/vídeos do Creative Center só aceitam 7 ou 30 dias (não 24h).
    const trendPeriod = period >= 30 ? 30 : 7;

    let items: any[] = [];
    if (type === "hashtags") {
      const raw = await runApify(ACTOR_TRENDS, { trendType: "hashtag", countryCode: country, period: trendPeriod, maxResults: limit });
      items = normHashtags(raw);
    } else if (type === "creatives") {
      const raw = await runApify(ACTOR_TRENDS, { trendType: "video", countryCode: country, period: trendPeriod, maxResults: limit });
      items = normCreatives(raw);
    } else {
      const raw = await runApify(ACTOR_PRODUCTS, {
        country_code: country, period_type: "last", last: String(period),
        ecom_type: "l3", order_by: "post", order_type: "desc", page: 1, limit, maxResults: limit,
      });
      items = normProducts(raw);
    }

    // Cache no CDN: 6h fresco + serve velho enquanto revalida.
    res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
    return res.status(200).json({ items, demo: items.length === 0, source: "apify", type, country, period });
  } catch (err) {
    return res.status(200).json({ items: [], demo: true, error: err instanceof Error ? err.message : String(err) });
  }
}
