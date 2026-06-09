// =============================================================================
// refresh-trends.mjs — gera os dados de "Em Alta" (TikTok Creative Center).
//
// Roda os actors do Apify (sem cookie) e grava JSON normalizado em
// public/trends-data/{tipo}-{PAÍS}.json. A tela lê esses arquivos direto da CDN
// (instantâneo). Rode periodicamente pra atualizar (cron/manual + deploy).
//
// Uso:
//   APIFY_TOKEN=apify_api_xxx node scripts/refresh-trends.mjs
//   APIFY_TOKEN=xxx COUNTRIES=BR,US node scripts/refresh-trends.mjs
// =============================================================================
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TOKEN = process.env.APIFY_TOKEN;
if (!TOKEN) { console.error("Falta APIFY_TOKEN"); process.exit(1); }

const COUNTRIES = (process.env.COUNTRIES || "BR,US").split(",").map((c) => c.trim().toUpperCase());
const PERIOD = Number(process.env.PERIOD || 7);
const LIMIT = Number(process.env.LIMIT || 20);

const ACTOR_TRENDS = "automation-lab~tiktok-trends-scraper";
const ACTOR_PRODUCTS = "burbn~tiktok-trending-products-scraper";
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "trends-data");

async function runApify(actor, input) {
  const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${TOKEN}`;
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  if (!res.ok) throw new Error(`${actor} -> ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

const normHashtags = (items) => items.filter((it) => it && it.name).map((it, i) => ({
  rank: it.rank ?? i + 1,
  name: String(it.name).replace(/^#/, ""),
  views: Number(it.videoViews ?? 0),
  posts: Number(it.publishedVideoCount ?? 0),
  trend: it.trend || "stable",
}));

const normCreatives = (items) => items.filter((it) => it && (it.videoUrl || it.videoId)).map((it, i) => ({
  rank: it.rank ?? i + 1,
  title: it.videoDesc || it.name || "Vídeo em alta",
  author: it.authorName || "",
  handle: (it.authorHandle || "").replace(/^@/, ""),
  views: Number(it.playCount ?? 0),
  likes: Number(it.likeCountVideo ?? 0),
  cover: it.videoCoverUrl || "",
  url: it.videoUrl || "",
  sound: it.soundName || "",
}));

const normProducts = (items) => items.filter(Boolean).map((it, i) => ({
  rank: it.rank ?? i + 1,
  name: it.title || it.name || "Produto",
  category: it.categoryName || it.category || "—",
  growth: Math.round(Number(it.postChange ?? it.post_change ?? 0)),
}));

async function save(name, data) {
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, name), JSON.stringify({ items: data, updatedAt: new Date().toISOString() }));
  console.log(`  ✓ ${name} (${data.length} itens)`);
}

for (const country of COUNTRIES) {
  console.log(`\n== ${country} ==`);
  try {
    const h = normHashtags(await runApify(ACTOR_TRENDS, { trendType: "hashtag", countryCode: country, period: PERIOD, maxResults: LIMIT }));
    await save(`hashtags-${country}.json`, h);
  } catch (e) { console.log("  hashtags falhou:", e.message); }
  try {
    const v = normCreatives(await runApify(ACTOR_TRENDS, { trendType: "video", countryCode: country, period: PERIOD, maxResults: LIMIT }));
    await save(`creatives-${country}.json`, v);
  } catch (e) { console.log("  creatives falhou:", e.message); }
  try {
    const p = normProducts(await runApify(ACTOR_PRODUCTS, { country_code: country, period_type: "last", last: String(PERIOD), ecom_type: "l3", order_by: "post", order_type: "desc", page: 1, limit: LIMIT, maxResults: LIMIT }));
    if (p.length) await save(`products-${country}.json`, p);
    else console.log("  products vazio (Shop protegido) — tela usa exemplos");
  } catch (e) { console.log("  products falhou:", e.message); }
}
console.log("\nPronto.");
