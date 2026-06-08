// =============================================================================
// tiktok-trends — Indicadores do TikTok (Creative Center) pro OnlyShop
//
// Puxa o que está EM ALTA no TikTok — sem a API oficial de shopping — usando o
// Apify "TikTok Creative Center Scraper" (o Apify mantém o anti-bot resolvido).
//   type="products"  → produtos do TikTok Shop bombando (por país/categoria)
//   type="hashtags"  → hashtags em alta
//   type="creatives" → criativos/vídeos em alta
//
// Chaves (Deno.env / Supabase secrets):
//   APIFY_TOKEN → token do Apify. SE AUSENTE, retorna { items: [], demo: true }
//                 e o front mostra exemplos — o app nunca quebra.
//   APIFY_ACTOR → opcional. Slug do actor (default: doliz~tiktok-creative-center-scraper)
//
// Cache: idealmente um cron chama isto 1x/dia e grava em `trends_cache`.
// Esta função já lê o cache se a tabela existir e estiver fresca (< 24h),
// senão chama o Apify e regrava. Sem a tabela, só chama o Apify on-demand.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type TrendType = "products" | "hashtags" | "creatives";

// Quanto tempo o cache é considerado fresco (24h).
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Mapeia o nosso "type" para o scrapeType esperado pelo actor do Apify.
// NOTA: ajuste estes valores conforme o input schema do actor escolhido.
const APIFY_SCRAPE_TYPE: Record<TrendType, string> = {
  products: "trending_products",
  hashtags: "trending_hashtags",
  creatives: "trending_videos",
};

async function fetchFromApify(opts: {
  type: TrendType;
  country: string;
  period: number;
  category?: string;
  limit: number;
}): Promise<any[]> {
  const token = Deno.env.get("APIFY_TOKEN");
  if (!token) return [];

  const actor = Deno.env.get("APIFY_ACTOR") ?? "doliz~tiktok-creative-center-scraper";
  const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${token}`;

  // Input do actor — campos comuns; ajuste conforme a doc do actor.
  const input = {
    scrapeType: APIFY_SCRAPE_TYPE[opts.type],
    countryCode: opts.country,
    period: opts.period,
    ...(opts.category ? { category: opts.category } : {}),
    limit: opts.limit,
    maxItems: opts.limit,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Apify falhou (${res.status}): ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data.slice(0, opts.limit) : [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const type: TrendType = (["products", "hashtags", "creatives"].includes(body.type) ? body.type : "products");
    const country: string = (body.country || "BR").toUpperCase();
    const period: number = [1, 7, 30].includes(Number(body.period)) ? Number(body.period) : 7;
    const category: string | undefined = body.category || undefined;
    const limit: number = Math.min(Number(body.limit) || 30, 50);

    const cacheKey = `${type}:${country}:${period}:${category || "all"}`;

    // 1) Tenta o cache no Supabase (se a tabela trends_cache existir).
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let supabase: any = null;
    if (supabaseUrl && serviceKey) {
      supabase = createClient(supabaseUrl, serviceKey);
      try {
        const { data: cached } = await supabase
          .from("trends_cache")
          .select("items, updated_at")
          .eq("cache_key", cacheKey)
          .maybeSingle();
        if (cached?.items && cached.updated_at) {
          const age = Date.now() - new Date(cached.updated_at as string).getTime();
          if (age < CACHE_TTL_MS) {
            return json({ items: cached.items, source: "cache", cacheKey });
          }
        }
      } catch {
        // tabela não existe ainda — segue pro Apify.
      }
    }

    // 2) Chama o Apify.
    let items: any[] = [];
    try {
      items = await fetchFromApify({ type, country, period, category, limit });
    } catch (e) {
      console.error("Apify error:", e);
    }

    // Sem token / sem dados → o front cai no modo demo.
    if (!items.length) {
      return json({ items: [], demo: true, source: Deno.env.get("APIFY_TOKEN") ? "empty" : "no_token", cacheKey });
    }

    // 3) Regrava o cache (best-effort).
    if (supabase) {
      try {
        await supabase.from("trends_cache").upsert(
          { cache_key: cacheKey, type, country, period, items, updated_at: new Date().toISOString() },
          { onConflict: "cache_key" }
        );
      } catch {
        // sem tabela — ignora.
      }
    }

    return json({ items, source: "apify", cacheKey });
  } catch (error) {
    console.error("tiktok-trends error:", error);
    return json({ items: [], demo: true, error: error instanceof Error ? error.message : "unknown" }, 200);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
