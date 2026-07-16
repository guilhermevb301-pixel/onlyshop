import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Radio, MessageCircle, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

// "Seu alcance" (áudio 1 do Biel): o creator declara quantas pessoas alcança +
// média de views + WhatsApp Business. Não precisa ser famoso — vale o alcance
// real (bairro, grupos, WhatsApp). A marca vê isso no perfil dele.
export function ReachCard({ delay = 0 }: { delay?: number }) {
  const { profile, updateProfile } = useAuth();
  const [reach, setReach] = useState(profile?.reach_estimate != null ? String(profile.reach_estimate) : "");
  const [views, setViews] = useState(profile?.avg_views != null ? String(profile.avg_views) : "");
  const [waBiz, setWaBiz] = useState(profile?.whatsapp_business ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({
        reach_estimate: reach.trim() ? Number(reach.replace(/\D/g, "")) : null,
        avg_views: views.trim() ? Number(views.replace(/\D/g, "")) : null,
        whatsapp_business: waBiz.replace(/\D/g, "") || null,
      });
      setSaved(true);
      toast.success("Alcance salvo!", { description: "As marcas veem seu alcance real — não precisa ser famoso." });
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
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20"><Radio className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1 pt-0.5">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">Seu alcance</span>
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Quanto você alcança</h2>
            <p className="mt-0.5 text-xs text-muted-foreground/70">Não precisa ser famoso. Vale seu WhatsApp, seus grupos, o pessoal do bairro — a marca vê isso.</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground/70">Pessoas que alcança</Label>
              <Input value={reach} onChange={(e) => setReach(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="2000" className="rounded-xl border-border/30" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground/70">Média de views/post</Label>
              <Input value={views} onChange={(e) => setViews(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="500" className="rounded-xl border-border/30" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground/70 flex items-center gap-1"><MessageCircle className="h-3 w-3" /> WhatsApp Business (opcional)</Label>
            <Input value={waBiz} onChange={(e) => setWaBiz(e.target.value)} placeholder="55 11 9..." className="rounded-xl border-border/30" />
          </div>
          <Button onClick={save} disabled={saving} className="w-full h-11 rounded-xl gap-2 bg-gradient-primary border-0 text-white active:scale-[.98] transition-transform" aria-busy={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
            {saved ? "Salvo" : "Salvar alcance"}
          </Button>
        </div>
      </div>
    </div>
  );
}
