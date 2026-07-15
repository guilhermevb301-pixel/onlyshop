import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Instagram, Music2, Globe, Loader2, Check, Youtube, MessageCircle } from "lucide-react";
import { toast } from "sonner";

// Tira https://, domínio, @ e barras — guarda só o handle (@usuario).
const cleanHandle = (v: string) =>
  v.trim()
    .replace(/^https?:\/\/(www\.)?(instagram|tiktok|youtube)\.com\/(@)?/i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "")
    .trim();

// Links sociais do influencer (digita o @, sem OAuth). A marca vê ao aceitar a
// campanha. Salva via useAuth.updateProfile (merge otimista, sem refetch).
export function SocialLinksCard({ delay = 0 }: { delay?: number }) {
  const { profile, updateProfile } = useAuth();
  const [ig, setIg] = useState(profile?.instagram_username ?? "");
  const [tt, setTt] = useState(profile?.tiktok_username ?? "");
  const [site, setSite] = useState(profile?.website ?? "");
  const [yt, setYt] = useState(profile?.youtube_username ?? "");
  const [wa, setWa] = useState(profile?.whatsapp ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({
        instagram_username: cleanHandle(ig) || null,
        tiktok_username: cleanHandle(tt) || null,
        website: site.trim() || null,
        youtube_username: cleanHandle(yt) || null,
        whatsapp: wa.replace(/\D/g, "") || null,
      });
      setSaved(true);
      toast.success("Links salvos!", { description: "As marcas veem seus links quando você aceita uma campanha." });
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
            <Instagram className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">Seus links</span>
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Onde te encontram</h2>
            <p className="mt-0.5 text-xs text-muted-foreground/70">A marca vê esses links quando você aceita a campanha dela.</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <Field icon={<Instagram className="h-4 w-4" />} label="Instagram" prefix="@" value={ig} onChange={setIg} placeholder="seu_usuario" />
          <Field icon={<Music2 className="h-4 w-4" />} label="TikTok" prefix="@" value={tt} onChange={setTt} placeholder="seu_usuario" />
          <Field icon={<Youtube className="h-4 w-4" />} label="YouTube" prefix="@" value={yt} onChange={setYt} placeholder="seu_canal" />
          <Field icon={<MessageCircle className="h-4 w-4" />} label="WhatsApp" value={wa} onChange={setWa} placeholder="55 11 9..." />
          <Field icon={<Globe className="h-4 w-4" />} label="Website / link" value={site} onChange={setSite} placeholder="https://..." />
          <Button onClick={save} disabled={saving} className="w-full h-11 rounded-xl gap-2 bg-gradient-primary border-0 text-white active:scale-[.98] transition-transform" aria-busy={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
            {saved ? "Salvo" : "Salvar links"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ icon, label, prefix, value, onChange, placeholder }: {
  icon: React.ReactNode; label: string; prefix?: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs flex items-center gap-1.5 text-muted-foreground/80">{icon} {label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/40">{prefix}</span>}
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`rounded-xl border-border/30 ${prefix ? "pl-7" : ""}`} />
      </div>
    </div>
  );
}
