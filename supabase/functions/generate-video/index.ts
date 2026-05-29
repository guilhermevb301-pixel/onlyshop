import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// =============================================================================
// generate-video — Estúdio IA do OnlyShop
//
// Gera vídeos de venda pro TikTok Shop a partir de um produto + uma persona de IA.
// Funciona em 2 passos (o front chama em sequência pra mostrar progresso):
//   step="script" → gera o roteiro de 3 cenas de 8s (PT-BR) via gateway de IA
//   step="clip"   → gera UM clipe de vídeo (8s) via fal.ai a partir do prompt da cena
//
// Chaves (Deno.env / Supabase secrets):
//   LOVABLE_API_KEY → já configurada (usada pelo ai-copilot). Gera o roteiro de graça.
//   FAL_KEY         → chave da fal.ai. SE AUSENTE, a função cai em MODO DEMO
//                     (retorna clipe placeholder) — o app nunca quebra.
// =============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Modelo da fal.ai. Seedance Lite = melhor custo/benefício pra clipe de 8s vertical.
// Trocar aqui pra subir de qualidade: .../kling-video/... ou .../veo3/...
const FAL_MODEL = "fal-ai/bytedance/seedance/v1/lite/text-to-video";

// Vídeo placeholder usado no MODO DEMO (sem FAL_KEY).
const DEMO_CLIP_URL =
  "https://storage.googleapis.com/falserverless/example_outputs/seedance_v1_lite_t2v.mp4";

const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

type Scene = { n: number; narration: string; visual_prompt: string; on_screen: string };

// ---- Passo 1: roteiro -------------------------------------------------------
async function generateScript(opts: {
  productName: string;
  productDescription: string;
  personaName: string;
  personaDescription: string;
}): Promise<{ hook: string; scenes: Scene[]; caption: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

  const system = `Você é roteirista de vídeos de venda virais pro TikTok Shop brasileiro.
Cria roteiros que vendem em 24 segundos (3 cenas de 8s), no estilo UGC nativo do TikTok.
Responda SEMPRE em português brasileiro, tom direto e natural — nada corporativo.
Retorne ESTRITAMENTE um JSON válido, sem texto antes ou depois, neste formato:
{
  "hook": "primeira frase de impacto (3s) que segura o scroll",
  "scenes": [
    { "n": 1, "narration": "fala da persona em PT-BR (cabe em ~8s)", "visual_prompt": "descrição visual EM INGLÊS pra gerar o vídeo (cena, ação, enquadramento, iluminação)", "on_screen": "texto curto que aparece na tela" },
    { "n": 2, "narration": "...", "visual_prompt": "...", "on_screen": "..." },
    { "n": 3, "narration": "... termina com CTA de compra", "visual_prompt": "...", "on_screen": "..." }
  ],
  "caption": "legenda do post com 2-3 hashtags e CTA"
}`;

  const user = `Produto: ${opts.productName}
Descrição do produto: ${opts.productDescription || "(sem descrição)"}

Persona que vai apresentar (influencer de IA): ${opts.personaName}
Estilo da persona: ${opts.personaDescription}

Gera o roteiro de 3 cenas de 8s pra essa persona vender esse produto no TikTok Shop.`;

  const res = await fetch(LOVABLE_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gateway de IA falhou (${res.status}): ${t.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? "";
  // Tira eventual ```json ... ``` que o modelo às vezes coloca.
  const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  // Normaliza: garante exatamente 3 cenas numeradas.
  const scenes: Scene[] = (parsed.scenes ?? []).slice(0, 3).map((s: any, i: number) => ({
    n: i + 1,
    narration: String(s.narration ?? ""),
    visual_prompt: String(s.visual_prompt ?? ""),
    on_screen: String(s.on_screen ?? ""),
  }));

  return { hook: String(parsed.hook ?? ""), scenes, caption: String(parsed.caption ?? "") };
}

// ---- Passo 2: clipe de vídeo ------------------------------------------------
async function generateClip(opts: {
  visualPrompt: string;
  personaDescription: string;
}): Promise<{ url: string; mode: "real" | "demo" }> {
  const FAL_KEY = Deno.env.get("FAL_KEY");

  // MODO DEMO: sem chave, devolve placeholder. App nunca quebra.
  if (!FAL_KEY) {
    return { url: DEMO_CLIP_URL, mode: "demo" };
  }

  const prompt = `${opts.visualPrompt}. Presenter: ${opts.personaDescription}. Vertical 9:16, UGC TikTok style, natural lighting, handheld feel, photorealistic.`;

  const res = await fetch(`https://fal.run/${FAL_MODEL}`, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      aspect_ratio: "9:16",
      resolution: "720p",
      duration: "8",
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`fal.ai falhou (${res.status}): ${t.slice(0, 200)}`);
  }

  const data = await res.json();
  const url = data?.video?.url ?? data?.url ?? data?.output?.url;
  if (!url) throw new Error("fal.ai não retornou URL de vídeo");
  return { url, mode: "real" };
}

// ---- Passo 3: combinar os clipes num único MP4 -----------------------------
async function mergeClips(clipUrls: string[]): Promise<{ url: string; mode: "real" | "demo" }> {
  const FAL_KEY = Deno.env.get("FAL_KEY");

  // MODO DEMO: sem chave, devolve o primeiro clipe como "combinado".
  if (!FAL_KEY) {
    return { url: clipUrls[0] ?? DEMO_CLIP_URL, mode: "demo" };
  }

  // ffmpeg da fal.ai concatena os clipes em 1 vídeo só.
  const res = await fetch("https://fal.run/fal-ai/ffmpeg-api/merge-videos", {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ video_urls: clipUrls, resolution: "portrait_16_9" }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Merge (ffmpeg) falhou (${res.status}): ${t.slice(0, 200)}`);
  }

  const data = await res.json();
  const url = data?.video?.url ?? data?.url;
  if (!url) throw new Error("ffmpeg não retornou URL do vídeo combinado");
  return { url, mode: "real" };
}

// ---- HTTP -------------------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const step = body.step ?? "script";

    if (step === "script") {
      const result = await generateScript({
        productName: body.productName ?? "Produto",
        productDescription: body.productDescription ?? "",
        personaName: body.personaName ?? "Persona",
        personaDescription: body.personaDescription ?? "",
      });
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (step === "clip") {
      const result = await generateClip({
        visualPrompt: body.visualPrompt ?? "",
        personaDescription: body.personaDescription ?? "",
      });
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (step === "merge") {
      const clipUrls: string[] = (body.clipUrls ?? []).filter(Boolean);
      if (clipUrls.length === 0) throw new Error("nenhum clipe pra combinar");
      const result = await mergeClips(clipUrls);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `step inválido: ${step}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
