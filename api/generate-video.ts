// =============================================================================
// /api/generate-video — Estúdio IA (Vercel Serverless Function)
//
// Gera vídeos de venda pro TikTok Shop usando SÓ a fal.ai (1 chave):
//   step="script" → roteiro de 3 cenas de 8s (PT-BR) via fal-ai/any-llm
//   step="clip"   → 1 clipe de 8s COM ÁUDIO (voz lip-sync) + rosto da foto
//                   via bytedance/seedance-2.0/image-to-video
//   step="merge"  → junta os clipes num MP4 único via fal-ai/ffmpeg-api
//
// Chave (Vercel env var):  FAL_KEY
//   SE AUSENTE → MODO DEMO (roteiro template + vídeo placeholder). Nunca quebra.
// =============================================================================

// Vídeo demora — sobe o limite da função serverless (máx no plano Hobby).
export const config = { maxDuration: 60 };

// Seedance 2.0: image-to-video com áudio lip-sync nativo. A foto da persona vira
// o rosto do vídeo, e a narração PT-BR é falada com sincronia labial.
const FAL_MODEL = "bytedance/seedance-2.0/image-to-video";
const LLM_MODEL = "anthropic/claude-sonnet-4.5";
const DEMO_CLIP_URL =
  "https://storage.googleapis.com/falserverless/example_outputs/seedance_v1_lite_t2v.mp4";

type Scene = { n: number; narration: string; visual_prompt: string; on_screen: string };

async function fal(path: string, body: unknown) {
  const FAL_KEY = process.env.FAL_KEY;
  const res = await fetch(`https://fal.run/${path}`, {
    method: "POST",
    headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`fal.ai ${path} falhou (${res.status}): ${t.slice(0, 200)}`);
  }
  return res.json();
}

// Parse defensivo do JSON que o LLM devolve. Modelos às vezes mandam JSON com
// markdown, texto em volta ou caracteres de controle (quebras de linha literais
// dentro de strings) — tudo isso quebra o JSON.parse cru. Aqui a gente blinda.
function safeParseScript(raw: string): any {
  let s = String(raw ?? "").replace(/```json\s*|\s*```/g, "").trim();
  // Recorta do primeiro { ao último } (descarta qualquer texto fora do objeto).
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
  // Remove vírgulas penduradas (",]" / ",}") — causa comum de JSON inválido do LLM.
  const stripTrailingCommas = (t: string) => t.replace(/,(\s*[}\]])/g, "$1");
  try {
    return JSON.parse(stripTrailingCommas(s));
  } catch {
    // Fallback: troca caracteres de controle não escapados por espaço (newlines
    // literais dentro das strings são a causa nº1 de "Bad escaped character").
    const cleaned = stripTrailingCommas(s.replace(/[\x00-\x1F]+/g, " "));
    return JSON.parse(cleaned);
  }
}

// ---- script -----------------------------------------------------------------
async function generateScript(o: {
  productName: string; productDescription: string; personaName: string; personaDescription: string;
}) {
  // Demo: roteiro template sem chave.
  if (!process.env.FAL_KEY) {
    return {
      hook: `Você precisa conhecer o ${o.productName}.`,
      scenes: [
        { n: 1, narration: `Oi, eu sou a ${o.personaName} e descobri o ${o.productName}.`, visual_prompt: `Presenter holding ${o.productName}, talking to camera`, on_screen: o.productName },
        { n: 2, narration: `${o.productDescription || "Funciona de verdade e o resultado aparece rápido."}`, visual_prompt: `Close-up of ${o.productName} with results`, on_screen: "Resultado real" },
        { n: 3, narration: `Corre que tá com link na loja. Toca aqui pra garantir o teu!`, visual_prompt: `Presenter pointing to buy button, excited`, on_screen: "Compre agora 🛒" },
      ] as Scene[],
      caption: `${o.productName} 🔥 #tiktokshop #achadinhos`,
      mode: "demo",
    };
  }

  const system = `Você é roteirista de vídeos virais de venda pro TikTok Shop brasileiro. Cria roteiros que vendem em 24s (3 cenas de 8s), estilo UGC nativo.

REGRAS OBRIGATÓRIAS:
- Escreva SEMPRE em português brasileiro natural e correto. NUNCA misture outros idiomas (nada de inglês, espanhol ou japonês no texto falado).
- Cada "narration" deve ter NO MÁXIMO 20 palavras (cabe em ~8s de fala natural).
- "visual_prompt" descreve a cena EM INGLÊS (vai pra IA de vídeo).
- Retorne ESTRITAMENTE um JSON válido em UMA ÚNICA LINHA. SEM markdown, SEM texto antes/depois, SEM quebras de linha dentro das strings.

Formato exato:
{"hook":"...","scenes":[{"n":1,"narration":"fala PT-BR (máx 20 palavras)","visual_prompt":"visual description in English","on_screen":"texto curto na tela"},{"n":2,...},{"n":3,"narration":"... termina com CTA de compra",...}],"caption":"legenda com hashtags"}`;
  const prompt = `Produto: ${o.productName}\nDescrição: ${o.productDescription || "(sem descrição)"}\nPersona apresentadora: ${o.personaName} — ${o.personaDescription}\n\nGera o roteiro de 3 cenas de 8s. Lembre: português perfeito, máximo 20 palavras por narração, JSON em uma linha só.`;

  // Tenta até 2 vezes — se o LLM mandar JSON quebrado, a 2ª costuma vir limpa.
  let parsed: any = null;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const data = await fal("fal-ai/any-llm", { model: LLM_MODEL, system_prompt: system, prompt, temperature: 0.6 });
      parsed = safeParseScript(data?.output ?? data?.text ?? "");
      if (parsed?.scenes?.length) break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!parsed?.scenes?.length) {
    throw new Error(lastErr instanceof Error ? lastErr.message : "roteiro não pôde ser gerado");
  }

  const scenes: Scene[] = (parsed.scenes ?? []).slice(0, 3).map((s: any, i: number) => ({
    n: i + 1,
    narration: String(s.narration ?? "").trim(),
    visual_prompt: String(s.visual_prompt ?? "").trim(),
    on_screen: String(s.on_screen ?? "").trim(),
  }));
  return { hook: String(parsed.hook ?? "").trim(), scenes, caption: String(parsed.caption ?? "").trim(), mode: "real" };
}

// ---- clip -------------------------------------------------------------------
// Seedance 2.0 image-to-video: usa a FOTO da persona como rosto e fala a
// narração PT-BR com lip-sync + áudio nativo.
async function generateClip(o: { visualPrompt: string; narration: string; personaPhotoUrl: string }) {
  if (!process.env.FAL_KEY) return { url: DEMO_CLIP_URL, mode: "demo" };

  const spoken = o.narration ? ` The presenter speaks in Brazilian Portuguese, lip-synced: "${o.narration}".` : "";
  const prompt = `${o.visualPrompt}.${spoken} Vertical 9:16, UGC TikTok style, natural lighting, handheld, photorealistic.`;

  const body: Record<string, unknown> = {
    prompt,
    aspect_ratio: "9:16",
    resolution: "720p",
    duration: "8",
    generate_audio: true,
  };
  // Foto de referência (vira o rosto do vídeo). Sem foto, ainda gera (text-driven).
  if (o.personaPhotoUrl) body.image_url = o.personaPhotoUrl;

  const data = await fal(FAL_MODEL, body);
  const url = data?.video?.url ?? data?.url;
  if (!url) throw new Error("Seedance não retornou URL");
  return { url, mode: "real" };
}

// ---- merge ------------------------------------------------------------------
async function mergeClips(clipUrls: string[]) {
  if (!process.env.FAL_KEY) return { url: clipUrls[0] ?? DEMO_CLIP_URL, mode: "demo" };
  const data = await fal("fal-ai/ffmpeg-api/merge-videos", { video_urls: clipUrls, resolution: "portrait_16_9" });
  const url = data?.video?.url ?? data?.url;
  if (!url) throw new Error("ffmpeg não retornou URL do vídeo combinado");
  return { url, mode: "real" };
}

// ---- handler ----------------------------------------------------------------
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "use POST" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const step = body.step ?? "script";

    if (step === "script") {
      return res.status(200).json(await generateScript({
        productName: body.productName ?? "Produto",
        productDescription: body.productDescription ?? "",
        personaName: body.personaName ?? "Persona",
        personaDescription: body.personaDescription ?? "",
      }));
    }
    if (step === "clip") {
      return res.status(200).json(await generateClip({
        visualPrompt: body.visualPrompt ?? "",
        narration: body.narration ?? "",
        personaPhotoUrl: body.personaPhotoUrl ?? "",
      }));
    }
    if (step === "merge") {
      const clipUrls: string[] = (body.clipUrls ?? []).filter(Boolean);
      if (!clipUrls.length) throw new Error("nenhum clipe pra combinar");
      return res.status(200).json(await mergeClips(clipUrls));
    }
    return res.status(400).json({ error: `step inválido: ${step}` });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
}
