import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Video, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

// Vídeo de apresentação do creator (media-kit). Cola um link do YouTube/Vimeo —
// aparece na página pública /i/CODIGO. Salva em profiles.intro_video_url.
export function IntroVideoCard({ delay = 0 }: { delay?: number }) {
  const { profile, updateProfile } = useAuth();
  const [url, setUrl] = useState(profile?.intro_video_url ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ intro_video_url: url.trim() || null });
      setSaved(true);
      toast.success("Vídeo salvo!", { description: "Aparece na sua página pública (o link da bio)." });
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
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
            <Video className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">Media-kit</span>
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Vídeo de apresentação</h2>
            <p className="mt-0.5 text-xs text-muted-foreground/70">Cole o link de um vídeo do YouTube — aparece na sua página pública pra quem quer te contratar.</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="rounded-xl border-border/30" />
          <Button onClick={save} disabled={saving} className="w-full h-11 rounded-xl gap-2 bg-gradient-primary border-0 text-white active:scale-[.98] transition-transform" aria-busy={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
            {saved ? "Salvo" : "Salvar vídeo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
