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
import { Loader2, Upload, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createInfluencer } from "@/lib/influencers";
import type { Persona } from "@/lib/personas";

const NICHES = [
  "Beleza & Skincare",
  "Fitness & Suplementos",
  "Moda & Acessórios",
  "Tech & Gadgets",
  "Casa & Cozinha",
  "Lifestyle & Bem-estar",
  "Geral / Lifestyle",
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onCreated: (persona: Persona) => void;
};

export function CreateInfluencerDialog({ open, onOpenChange, userId, onCreated }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [niche, setNiche] = useState(NICHES[5]);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFile(null);
    setPreview(null);
    setName("");
    setNiche(NICHES[5]);
    setDescription("");
    setSaving(false);
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

  async function handleSave() {
    if (!file) return toast.error("Falta a foto", { description: "Suba uma foto do seu influencer." });
    if (!name.trim()) return toast.error("Falta o nome", { description: "Dê um nome pro influencer." });
    setSaving(true);
    try {
      const persona = await createInfluencer({
        userId,
        name: name.trim(),
        niche,
        description: description.trim(),
        file,
      });
      toast.success("Influencer criado!", { description: `${persona.name} já está disponível no Estúdio.` });
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
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Criar influencer
          </DialogTitle>
          <DialogDescription>
            Suba uma foto e crie seu influencer de IA. Ele apresenta seus produtos — você não precisa aparecer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload */}
          <div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
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
                  <p className="text-[10px] text-muted-foreground/60">JPG ou PNG, rosto bem visível</p>
                </>
              )}
            </button>
            {preview && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-[11px] text-primary mt-1.5 mx-auto block"
              >
                Trocar foto
              </button>
            )}
          </div>

          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="infl-name" className="text-xs">Nome</Label>
            <Input id="infl-name" placeholder="Ex: Helena" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          </div>

          {/* Nicho */}
          <div className="space-y-1.5">
            <Label className="text-xs">Nicho</Label>
            <Select value={niche} onValueChange={setNiche}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NICHES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Descrição (vibe) */}
          <div className="space-y-1.5">
            <Label htmlFor="infl-desc" className="text-xs">Estilo / vibe <span className="text-muted-foreground/60">(opcional)</span></Label>
            <Textarea
              id="infl-desc"
              placeholder="Ex: jovem, sorriso acolhedor, fala animada e natural, ambiente aconchegante"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={300}
            />
          </div>

          <Button className="w-full h-11" onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Criando...</> : <><Sparkles className="h-4 w-4 mr-2" /> Criar influencer</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
