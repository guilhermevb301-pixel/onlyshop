import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  PERSONAS, resolvePersonaPhoto, type Persona,
} from "@/lib/personas";
import { listInfluencers } from "@/lib/influencers";
import { CreateInfluencerDialog } from "@/components/studio/CreateInfluencerDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Sparkles, Wand2, Film, Loader2, Check, ArrowLeft, Download, RotateCcw,
  Package, Upload, Copy, Settings2, AlertCircle,
} from "lucide-react";

// ---- Tipos ------------------------------------------------------------------
type Product = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  category: string | null;
  brands?: { name: string } | null;
};

type Scene = { n: number; narration: string; visual_prompt: string; on_screen: string };
type Script = { hook: string; scenes: Scene[]; caption: string };
type ClipState = { status: "pending" | "loading" | "done" | "error"; url?: string; mode?: string };

type Stage = "product" | "persona" | "generating" | "preview";

// Produtos de exemplo caso o catálogo ainda esteja vazio (modo demo da reunião).
const DEMO_PRODUCTS: Product[] = [
  { id: "demo-1", name: "Sérum Vitamina C Glow", description: "Sérum facial clareador com vitamina C pura, uniformiza a pele em 2 semanas.", image_url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400", price: 89.9, category: "Beleza", brands: { name: "GlowLab" } },
  { id: "demo-2", name: "Whey Protein Chocolate 900g", description: "Whey concentrado, 24g de proteína por dose, sabor chocolate intenso.", image_url: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400", price: 129.9, category: "Fitness", brands: { name: "FitPro" } },
  { id: "demo-3", name: "Mini Liquidificador Portátil USB", description: "Faz seu shake em qualquer lugar, recarregável por USB, 6 lâminas.", image_url: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=400", price: 79.9, category: "Casa", brands: { name: "HomeEasy" } },
];

// Chama a função serverless da Vercel (/api/generate-video).
async function callGen(body: Record<string, unknown>) {
  const res = await fetch("/api/generate-video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "erro na geração");
  return data;
}

export default function Studio() {
  const { user } = useAuth();
  const location = useLocation();

  const [stage, setStage] = useState<Stage>("product");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [customPersonas, setCustomPersonas] = useState<Persona[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [product, setProduct] = useState<Product | null>(null);
  const [persona, setPersona] = useState<Persona | null>(null);

  const [script, setScript] = useState<Script | null>(null);
  const [clips, setClips] = useState<ClipState[]>([]);
  const [finalVideo, setFinalVideo] = useState<{ url: string; mode: string } | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [genError, setGenError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allPersonas = [...customPersonas, ...PERSONAS];

  // Carrega catálogo real; cai pros demo se vazio.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, description, image_url, price, category, brands(name)")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(12);
      setProducts(data && data.length ? (data as any) : DEMO_PRODUCTS);
      setLoadingProducts(false);
    })();
  }, []);

  // Carrega os influencers do usuário.
  useEffect(() => {
    if (!user) return;
    listInfluencers(user.id).then(setCustomPersonas).catch(() => {});
  }, [user]);

  // Pré-seleção vinda de "Meus Influencers" (navigate com state.persona).
  useEffect(() => {
    const st = location.state as { persona?: Persona; product?: Product } | null;
    if (st?.product) {
      setProduct(st.product as Product);
      setStage("persona");
    }
    if (st?.persona) {
      setPersona(st.persona);
      if (!st.product) toast.success(`${st.persona.name} selecionado`, { description: "Agora escolha o produto." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cronômetro durante a geração.
  useEffect(() => {
    if (stage === "generating") {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stage]);

  // ---- Geração --------------------------------------------------------------
  async function generate() {
    if (!product || !persona) return;
    setStage("generating");
    setScript(null);
    setClips([]);
    setFinalVideo(null);
    setGenError(false);
    setProgress(5);

    try {
      // Passo 1: roteiro
      setStatusMsg("Escrevendo o roteiro de 3 cenas...");
      const sc = (await callGen({
        step: "script",
        productName: product.name,
        productDescription: product.description ?? "",
        personaName: persona.name,
        personaDescription: persona.description,
      })) as Script;
      setScript(sc);
      setClips(sc.scenes.map(() => ({ status: "pending" as const })));
      setProgress(20);

      const photoUrl = resolvePersonaPhoto(persona.avatar);

      // Passo 2: um clipe por cena (sequencial → mostra progresso)
      const clipUrls: string[] = [];
      for (let i = 0; i < sc.scenes.length; i++) {
        setStatusMsg(`Gravando a cena ${i + 1} de ${sc.scenes.length} com ${persona.name}...`);
        setClips((prev) => prev.map((c, idx) => (idx === i ? { ...c, status: "loading" } : c)));

        let clipRes: { url: string; mode: string };
        try {
          clipRes = (await callGen({
            step: "clip",
            visualPrompt: sc.scenes[i].visual_prompt,
            narration: sc.scenes[i].narration,
            personaPhotoUrl: photoUrl,
          })) as { url: string; mode: string };
        } catch {
          setClips((prev) => prev.map((c, idx) => (idx === i ? { status: "error" } : c)));
          setProgress(20 + Math.round(((i + 1) / sc.scenes.length) * 60));
          continue;
        }
        const { url, mode } = clipRes;
        clipUrls.push(url);
        setClips((prev) => prev.map((c, idx) => (idx === i ? { status: "done", url, mode } : c)));
        setProgress(20 + Math.round(((i + 1) / sc.scenes.length) * 60));
      }

      // Passo 3: combinar os clipes num único MP4
      if (clipUrls.length > 0) {
        setStatusMsg("Juntando as cenas num vídeo só...");
        setProgress(90);
        try {
          const mergeData = await callGen({ step: "merge", clipUrls });
          if (mergeData) setFinalVideo(mergeData as { url: string; mode: string });
        } catch {
          /* se o merge falhar, ainda mostramos os clipes separados */
        }
      }

      setProgress(100);
      setStage("preview");
    } catch {
      // Erro no roteiro — mensagem humana, sem jargão técnico, com ação clara.
      setGenError(true);
      setStage("persona");
      toast.error("Não consegui criar o vídeo agora", {
        description: "A IA estava cheia. Toque em \"Gerar vídeo\" de novo — costuma resolver na hora. Você não foi cobrado.",
      });
    }
  }

  function reset() {
    setStage("product");
    setProduct(null);
    setPersona(null);
    setScript(null);
    setClips([]);
    setFinalVideo(null);
    setGenError(false);
    setProgress(0);
  }

  function copyCaption() {
    if (!script?.caption) return;
    navigator.clipboard.writeText(script.caption);
    toast.success("Legenda copiada!", { description: "Cola direto no TikTok." });
  }

  function downloadVideo(url: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = "onlyshop-video.mp4";
    a.target = "_blank";
    a.rel = "noreferrer";
    a.click();
  }

  const isDemoMode = clips.some((c) => c.mode === "demo") || finalVideo?.mode === "demo";
  const previewUrl = finalVideo?.url ?? clips.find((c) => c.url)?.url ?? null;
  const showPreviewCol = stage === "generating" || stage === "preview";

  // ===========================================================================
  return (
    <div className="max-w-lg mx-auto px-4 py-5 pb-24 lg:max-w-5xl lg:px-8 lg:py-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-5">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center">
            <Wand2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Estúdio IA</h1>
            <p className="text-xs text-muted-foreground">Vídeo de venda pronto em minutos</p>
          </div>
        </div>
        <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
          <Link to="/meus-influencers"><Settings2 className="h-3.5 w-3.5 mr-1" /> Meus influencers</Link>
        </Button>
      </div>

      {/* Stepper */}
      <div className="flex items-stretch gap-2 mb-6">
        {["Produto", "Influencer", "Vídeo"].map((label, i) => {
          const active =
            (stage === "product" && i === 0) ||
            (stage === "persona" && i === 1) ||
            ((stage === "generating" || stage === "preview") && i === 2);
          const done =
            (i === 0 && stage !== "product") ||
            (i === 1 && (stage === "generating" || stage === "preview"));
          return (
            <div key={label} className="flex-1">
              <div className={cn(
                "h-1.5 rounded-full transition-colors",
                active ? "bg-primary" : done ? "bg-primary/40" : "bg-muted"
              )} />
              <p className={cn(
                "text-[10px] mt-1.5 font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground/50"
              )}>{i + 1}. {label}</p>
            </div>
          );
        })}
      </div>

      {/* GRID cockpit (desktop: controles | preview) */}
      <div className="lg:grid lg:grid-cols-[1fr_minmax(340px,400px)] lg:gap-8 lg:items-start">
        {/* ============ COLUNA ESQUERDA — controles ============ */}
        <div className={cn(showPreviewCol && "hidden lg:block")}>
          {/* ---- PRODUTO ---- */}
          <section className={cn(stage === "product" ? "block" : "hidden", "lg:block lg:mb-8")}>
            <h2 className="font-semibold mb-1 flex items-center gap-1.5">
              <Package className="h-4 w-4 text-primary" /> Escolha o produto
            </h2>
            <p className="text-xs text-muted-foreground mb-4">O que você vai vender nesse vídeo.</p>
            {loadingProducts ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setProduct(p); if (stage === "product") setStage("persona"); }}
                    className={cn(
                      "text-left rounded-2xl border bg-card overflow-hidden transition-colors",
                      product?.id === p.id ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary"
                    )}
                  >
                    <div className="aspect-square bg-muted overflow-hidden">
                      {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-medium line-clamp-2 leading-snug">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">R$ {Number(p.price).toFixed(2)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ---- PERSONA ---- */}
          <section className={cn(stage === "persona" ? "block" : "hidden", "lg:block")}>
            <button
              onClick={() => setStage("product")}
              className="text-xs text-muted-foreground flex items-center gap-1 mb-3 lg:hidden"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Trocar produto
            </button>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" /> Escolha o influencer
              </h2>
              <Link to="/meus-influencers" className="text-[11px] text-primary hidden lg:block">Gerenciar →</Link>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Quem vai apresentar{product ? <span className="font-medium text-foreground"> {product.name}</span> : " seu produto"}. Você não precisa aparecer.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-4 lg:grid-cols-4">
              {allPersonas.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPersona(p)}
                  className={cn(
                    "rounded-2xl border p-2 text-center transition-all relative",
                    persona?.id === p.id ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                  )}
                >
                  {p.custom && (
                    <Badge variant="secondary" className="absolute -top-1.5 -right-1.5 text-[8px] px-1 py-0 bg-primary text-primary-foreground border-0">seu</Badge>
                  )}
                  <img src={p.avatar} alt={p.name} className="w-full aspect-square object-cover rounded-xl mb-1.5" />
                  <p className="text-xs font-medium leading-none">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{p.niche}</p>
                </button>
              ))}
            </div>

            {/* Criar influencer próprio (dialog real) */}
            <button
              onClick={() => setDialogOpen(true)}
              className="w-full rounded-2xl border border-dashed border-border p-3 flex items-center justify-center gap-2 text-xs text-muted-foreground mb-5 hover:border-primary/50 transition-colors"
            >
              <Upload className="h-3.5 w-3.5" /> Criar com minha própria foto
            </button>

            <Button className="w-full h-12 text-base" disabled={!product || !persona} onClick={generate}>
              <Wand2 className="h-4 w-4 mr-1.5" />
              {!product ? "Escolha um produto" : !persona ? "Escolha um influencer" : genError ? "Tentar de novo" : "Gerar vídeo de venda"}
            </Button>
          </section>
        </div>

        {/* ============ COLUNA DIREITA — preview ============ */}
        <div className={cn(showPreviewCol ? "block" : "hidden", "mt-6 lg:mt-0 lg:block lg:sticky lg:top-16")}>
          <PhonePreview
            stage={stage}
            persona={persona}
            product={product}
            script={script}
            clips={clips}
            previewUrl={previewUrl}
            finalVideo={finalVideo}
            statusMsg={statusMsg}
            progress={progress}
            elapsed={elapsed}
            isDemoMode={isDemoMode}
          />

          {/* Ações do preview */}
          {stage === "preview" && (
            <div className="flex gap-2 mt-3">
              <Button variant="outline" className="flex-1" onClick={reset}>
                <RotateCcw className="h-4 w-4 mr-1.5" /> Novo
              </Button>
              <Button className="flex-1" disabled={!previewUrl} onClick={() => previewUrl && downloadVideo(previewUrl)}>
                <Download className="h-4 w-4 mr-1.5" /> Baixar pra postar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Roteiro + cenas (preview, abaixo no full width) */}
      {stage === "preview" && script && (
        <div className="mt-8 lg:grid lg:grid-cols-2 lg:gap-6">
          {/* Cenas separadas */}
          <div className="mb-6 lg:mb-0">
            <p className="text-xs font-semibold mb-2">Cenas separadas</p>
            <div className="flex gap-2 overflow-x-auto pb-2 snap-x lg:grid lg:grid-cols-3 lg:overflow-visible">
              {script.scenes.map((s, i) => (
                <div key={s.n} className="snap-start shrink-0 w-32 lg:w-auto">
                  <div className="aspect-[9/16] rounded-xl overflow-hidden bg-muted relative">
                    {clips[i]?.url ? (
                      <video src={clips[i].url} className="w-full h-full object-cover" controls playsInline muted loop />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[11px] text-muted-foreground text-center px-2">
                        essa cena não saiu
                      </div>
                    )}
                    <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">Cena {s.n}</div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{s.on_screen}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Roteiro */}
          <Card>
            <CardContent className="p-4">
              <p className="text-[11px] font-semibold text-primary mb-1">GANCHO</p>
              <p className="text-sm mb-3">{script.hook}</p>
              {script.scenes.map((s) => (
                <div key={s.n} className="mb-2">
                  <p className="text-[11px] font-semibold text-muted-foreground">Cena {s.n}</p>
                  <p className="text-sm">{s.narration}</p>
                </div>
              ))}
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[11px] font-semibold text-muted-foreground">Legenda</p>
                  <button onClick={copyCaption} className="text-[11px] text-primary flex items-center gap-1">
                    <Copy className="h-3 w-3" /> Copiar
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{script.caption}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {user && (
        <CreateInfluencerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          userId={user.id}
          onCreated={(p) => { setCustomPersonas((prev) => [p, ...prev]); setPersona(p); }}
        />
      )}
    </div>
  );
}

// ---- Preview de celular (empty / generating / preview) ----------------------
function PhonePreview(props: {
  stage: Stage;
  persona: Persona | null;
  product: Product | null;
  script: Script | null;
  clips: ClipState[];
  previewUrl: string | null;
  finalVideo: { url: string; mode: string } | null;
  statusMsg: string;
  progress: number;
  elapsed: number;
  isDemoMode: boolean;
}) {
  const { stage, persona, product, script, clips, previewUrl, statusMsg, progress, elapsed, isDemoMode } = props;
  const mm = String(Math.floor(elapsed / 60)).padStart(1, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div>
      {/* Moldura do celular */}
      <div className="mx-auto w-full max-w-[280px] lg:max-w-none">
        <div className="rounded-[2rem] border border-border bg-card p-1.5 shadow-xl">
          <div className="aspect-[9/16] rounded-[1.6rem] overflow-hidden bg-black relative">
            {/* PREVIEW pronto */}
            {stage === "preview" && previewUrl ? (
              <video src={previewUrl} className="w-full h-full object-contain bg-black" controls playsInline autoPlay loop />
            ) : stage === "generating" ? (
              /* GERANDO */
              <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center">
                <Loader2 className="h-9 w-9 animate-spin text-primary mb-3" />
                <p className="text-sm font-medium text-white mb-1">Criando seu vídeo</p>
                <p className="text-[11px] text-white/60 mb-4 min-h-[28px]">{statusMsg}</p>
                <div className="w-full max-w-[200px]">
                  <Progress value={progress} className="h-1.5" />
                  <p className="text-[10px] text-white/50 mt-2">{mm}:{ss} • normalmente leva ~2 min</p>
                </div>
              </div>
            ) : (
              /* EMPTY — mostra o que está montado */
              <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center">
                {persona ? (
                  <img src={persona.avatar} alt={persona.name} className="h-20 w-20 rounded-2xl object-cover mb-3 opacity-80" />
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
                    <Film className="h-8 w-8 text-white/20" />
                  </div>
                )}
                <p className="text-sm font-medium text-white/80">{persona ? persona.name : "Seu vídeo aparece aqui"}</p>
                <p className="text-[11px] text-white/40 mt-1">
                  {product ? product.name : "Escolha produto e influencer"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cabeçalho do preview / status de cenas durante geração */}
      {stage === "generating" && script && (
        <div className="space-y-1.5 mt-3 max-w-[280px] mx-auto lg:max-w-none">
          {script.scenes.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2 text-xs">
              {clips[i]?.status === "done" ? <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                : clips[i]?.status === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                : clips[i]?.status === "error" ? <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                : <Film className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
              <span className="text-muted-foreground line-clamp-1">Cena {s.n}: {s.narration}</span>
            </div>
          ))}
        </div>
      )}

      {/* Aviso de modo demo (vídeo de exemplo sem áudio) */}
      {stage === "preview" && isDemoMode && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 max-w-[280px] mx-auto lg:max-w-none">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground">
            Vídeo de exemplo (sem áudio). Conecte a chave do gerador pra criar vídeos reais com voz.
          </p>
        </div>
      )}
    </div>
  );
}
