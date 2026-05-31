import { useState, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, Sparkles, Wand2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { createInfluencer, createInfluencerFromUrl } from "@/lib/influencers";
import { markMilestone } from "@/lib/journey";
import { cn } from "@/lib/utils";
import type { Persona } from "@/lib/personas";

const NICHES = [
  "Beleza & Skincare", "Fitness & Suplementos", "Moda & Acessórios",
  "Tech & Gadgets", "Casa & Cozinha", "Lifestyle & Bem-estar", "Geral / Lifestyle",
];
const AGES = [
  { label: "18 a 25 anos", value: "early-20s" },
  { label: "26 a 35 anos", value: "late-20s to early-30s" },
  { label: "36 a 50 anos", value: "40s" },
  { label: "Mais de 50", value: "50s" },
];

async function callGen(body: Record<string, unknown>) {
  const res = await fetch("/api/generate-video", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "erro na geração");
  return data;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onCreated: (persona: Persona) => void;
};

export function CreateInfluencerDialog({ open, onOpenChange, userId, onCreated }: Props) {
  const [mode, setMode] = useState<"upload" | "ai">("ai");

  // comuns
  const [name, setName] = useState("");
  const [niche, setNiche] = useState(NICHES[5]);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // upload
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // IA
  const [gender, setGender] = useState("woman");
  const [age, setAge] = useState(AGES[0].value);
  const [genUrl, setGenUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  function reset() {
    setMode("ai"); setName(""); setNiche(NICHES[5]); setDescription(""); setSaving(false);
    setFile(null); setPreview(null); setGender("woman"); setAge(AGES[0].value);
    setGenUrl(null); setGenerating(false);
  }

  function pickFile(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Arquivo inválido", { description: "Escolha uma imagem (JPG ou PNG)." });
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function generateImage() {
    setGenerating(true);
    setGenUrl(null);
    try {
      const res = (await callGen({
        step: "influencer-image",
        gender,
        age,
        vibe: description.trim() || "friendly, approachable, natural",
        niche,
      })) as { url: string; mode: string };
      setGenUrl(res.url);
      if (res.mode === "demo") {
        toast.info("Modo demo", { description: "Imagem de exemplo. No ar, a IA gera de verdade." });
      }
    } catch (e: any) {
      toast.error("Não consegui gerar", { description: e?.message ?? "Tenta de novo." });
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) return toast.error("Falta o nome", { description: "Dê um nome pro influencer." });

    if (mode === "ai" && !genUrl) return toast.error("Falta gerar a imagem", { description: "Toque em \"Gerar imagem\" primeiro." });
    if (mode === "upload" && !file) return toast.error("Falta a foto", { description: "Suba uma foto." });

    setSaving(true);
    try {
      const persona = mode === "ai"
        ? await createInfluencerFromUrl({ userId, name: name.trim(), niche, description: description.trim(), photoUrl: genUrl! })
        : await createInfluencer({ userId, name: name.trim(), niche, description: description.trim(), file: file! });

      markMilestone("influencer_created");
      toast.success("Seu influencer nasceu 🎬", { description: "Agora bora gerar seu 1º vídeo de venda." });
      onCreated(persona);
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Não consegui criar", { description: e?.message ?? "Tenta de novo." });
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) { onOpenChange(o); if (!o) reset(); } }}>
      <DialogContent className="sm:max-w-md rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Criar influencer
          </DialogTitle>
          <DialogDescription>
            Seu influencer de IA apresenta os produtos — você não precisa aparecer.
          </DialogDescription>
        </DialogHeader>

        {/* Toggle modo */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-white/[0.04]">
          {([["ai", "✨ Gerar com IA"], ["upload", "Subir minha foto"]] as const).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "h-9 rounded-xl text-xs font-medium transition-all",
                mode === m ? "bg-gradient-primary text-white shadow-[var(--shadow-glow-cta)]" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {/* ===== MODO IA ===== */}
          {mode === "ai" && (
            <>
              <div className="aspect-[3/4] max-h-56 mx-auto w-full rounded-2xl border border-border bg-card/50 overflow-hidden flex items-center justify-center relative">
                {generating ? (
                  <div className="text-center">
                    <Loader2 className="h-7 w-7 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Criando seu influencer...</p>
                  </div>
                ) : genUrl ? (
                  <>
                    <img src={genUrl} alt="influencer gerado" className="w-full h-full object-cover" />
                    <button onClick={generateImage} className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/70 text-white text-[11px] px-2.5 py-1">
                      <RefreshCw className="h-3 w-3" /> Gerar outra
                    </button>
                  </>
                ) : (
                  <div className="text-center px-6">
                    <div className="h-11 w-11 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-2">
                      <Wand2 className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-xs text-muted-foreground">Defina o estilo e a IA cria o rosto</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Gênero</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="woman">Mulher</SelectItem>
                      <SelectItem value="man">Homem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Idade</Label>
                  <Select value={age} onValueChange={setAge}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AGES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={generateImage} disabled={generating}>
                {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</> : <><Wand2 className="h-4 w-4 mr-2" /> {genUrl ? "Gerar outra imagem" : "Gerar imagem com IA"}</>}
              </Button>
            </>
          )}

          {/* ===== MODO UPLOAD ===== */}
          {mode === "upload" && (
            <div>
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full aspect-[3/4] max-h-56 mx-auto rounded-2xl border border-dashed border-border bg-card/50 overflow-hidden flex flex-col items-center justify-center gap-2 hover:border-primary/60 transition-colors"
              >
                {preview ? (
                  <img src={preview} alt="prévia" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                      <Upload className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-xs text-muted-foreground">Toque pra escolher uma foto</p>
                  </>
                )}
              </button>
            </div>
          )}

          {/* ===== Campos comuns ===== */}
          <div className="space-y-1.5">
            <Label htmlFor="infl-name" className="text-xs">Nome</Label>
            <Input id="infl-name" placeholder="Ex: Helena" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nicho</Label>
            <Select value={niche} onValueChange={setNiche}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{NICHES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="infl-desc" className="text-xs">Estilo / vibe <span className="text-muted-foreground/60">(opcional)</span></Label>
            <Textarea id="infl-desc" placeholder="Ex: sorriso acolhedor, fala animada, ambiente aconchegante" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={300} />
          </div>

          <Button className="w-full h-11" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Criando...</> : <><Sparkles className="h-4 w-4 mr-2" /> Criar influencer</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
