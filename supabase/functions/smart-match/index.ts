// Smart Match: SQL filtra top 50, OpenAI reranqueia top 10
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  mode: "affiliates_for_brand" | "brands_for_affiliate";
  brand_id?: string;
  rerank?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const body = (await req.json()) as Body;
    const rerank = body.rerank !== false;

    let candidates: any[] = [];
    let context = "";

    if (body.mode === "affiliates_for_brand") {
      if (!body.brand_id) return json({ error: "brand_id required" }, 400);
      const { data, error } = await supabase.rpc("match_affiliates_for_brand", {
        _brand_id: body.brand_id,
        _limit: 50,
      });
      if (error) throw error;
      candidates = data || [];
      context = `Você está sugerindo afiliados para uma marca. Priorize: alinhamento de nicho, proximidade geográfica, performance comprovada e taxa de conversão.`;
    } else if (body.mode === "brands_for_affiliate") {
      const { data, error } = await supabase.rpc("match_brands_for_affiliate", {
        _user_id: userData.user.id,
        _limit: 50,
      });
      if (error) throw error;
      candidates = data || [];
      context = `Você está sugerindo marcas/produtos para um afiliado. Priorize: nicho do afiliado, proximidade, marcas verificadas e potencial de comissão.`;
    } else {
      return json({ error: "invalid mode" }, 400);
    }

    if (candidates.length === 0) return json({ matches: [] });
    if (!rerank) return json({ matches: candidates.slice(0, 10) });

    // Rerank with OpenAI
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o";
    if (!OPENAI_API_KEY) {
      // sem IA, devolve top 10 do SQL
      return json({ matches: candidates.slice(0, 10) });
    }

    const compact = candidates.slice(0, 50).map((c, i) => ({
      idx: i,
      ...(body.mode === "affiliates_for_brand"
        ? {
            name: c.display_name || c.username,
            city: c.city,
            niches: c.niches,
            followers: c.followers_count,
            sales: c.total_sales,
            conv: c.conversion_rate,
            score: c.performance_score,
            distance_km: c.distance_km,
            niche_overlap: c.niche_overlap,
          }
        : {
            name: c.name,
            city: c.city,
            niches: c.niches,
            verified: c.verified,
            distance_km: c.distance_km,
            niche_overlap: c.niche_overlap,
          }),
    }));

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: `${context}\nRetorne os 10 melhores via tool call.` },
          { role: "user", content: `Candidatos:\n${JSON.stringify(compact)}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "rank_matches",
              description: "Devolve os 10 melhores matches com justificativa curta",
              parameters: {
                type: "object",
                properties: {
                  ranked: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        idx: { type: "number" },
                        reason: { type: "string", description: "máx 80 caracteres, em português" },
                      },
                      required: ["idx", "reason"],
                    },
                  },
                },
                required: ["ranked"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "rank_matches" } },
      }),
    });

    if (aiResp.status === 429) return json({ error: "Limite de IA atingido. Tente novamente em instantes." }, 429);
    if (aiResp.status === 402) return json({ error: "Créditos de IA esgotados." }, 402);
    if (!aiResp.ok) {
      console.error("AI gateway error", aiResp.status, await aiResp.text());
      return json({ matches: candidates.slice(0, 10) });
    }

    const aiJson = await aiResp.json();
    const args = aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return json({ matches: candidates.slice(0, 10) });

    const parsed = JSON.parse(args);
    const ranked = (parsed.ranked || [])
      .slice(0, 10)
      .map((r: { idx: number; reason: string }) => {
        const c = candidates[r.idx];
        return c ? { ...c, ai_reason: r.reason } : null;
      })
      .filter(Boolean);

    return json({ matches: ranked });
  } catch (e) {
    console.error("smart-match error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
