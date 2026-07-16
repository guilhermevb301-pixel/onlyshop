import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Film, Plus, X, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

const MAX = 6;

// "Seus vídeos campeões" (áudio 3 do Biel): galeria de vídeos/cases que TOCAM na
// página pública (/i/CODIGO) — não só link. YouTube/Vimeo/mp4. Editável pelo dono.
export function VideoGalleryCard({ delay = 0 }: { delay?: number }) {
  const { profile, updateProfile } = useAuth();
  const [items, setItems] = useState<string[]>(profile?.video_gallery ?? []);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (items.length >= MAX) { toast.error(`Máximo ${MAX} vídeos`); return; }
    setItems([...items, v]);
    setInput("");
  };
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ video_gallery: items });
      setSaved(true);
      toast.success("Galeria salva!", { description: "Seus vídeos aparecem na sua página pública." });
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error("Não foi possível salvar agora");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-slide-up rounded-[1.5rem] border border-border/40 bg-gradient-to-b from-white/[0.05] to-transparent p-[1px]" style={{ animationDelay: `${delay}ms`, opacity: 0 }}>
      <div className="rounded-[1.4rem] bg-card/80 p-5 ring-1 ring-inset ring-white/[0.04] shadow-[var(--shadow-bezel-inset)]">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20"><Film className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1 pt-0.5">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">Media-kit</span>
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Seus vídeos campeões</h2>
            <p className="mt-0.5 text-xs text-muted-foreground/70">Cole links de vídeos (YouTube, Vimeo, mp4). Eles tocam na sua página — cases, Reels que bombaram.</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {items.map((v, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08] px-3 py-2">
              <Film className="h-3.5 w-3.5 text-accent shrink-0" />
              <span className="text-xs truncate flex-1 font-mono text-white/70">{v}</span>
              <button type="button" onClick={() => remove(i)} aria-label="Remover vídeo" className="text-muted-foreground/40 hover:text-destructive p-1"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {items.length < MAX && (
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                placeholder="https://youtube.com/watch?v=..."
                className="rounded-xl border-border/30"
              />
              <Button type="button" onClick={add} size="icon" variant="outline" className="h-10 w-10 rounded-xl shrink-0 border-white/10 bg-white/[0.03]"><Plus className="h-4 w-4" /></Button>
            </div>
          )}
          <Button onClick={save} disabled={saving} className="w-full h-11 rounded-xl gap-2 bg-gradient-primary border-0 text-white active:scale-[.98] transition-transform" aria-busy={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
            {saved ? "Salvo" : "Salvar galeria"}
          </Button>
        </div>
      </div>
    </div>
  );
}
