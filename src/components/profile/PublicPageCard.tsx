import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, Instagram, Music2, Youtube, Globe, Video, Pencil, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// "Sua página pública" (o linktree do influenciador) DENTRO do perfil — pedido do
// Biel: no meu perfil eu vejo/edito meu linktree (redes + vídeo) e pego o link
// que colo na bio. A página em si vive em /i/CODIGO; aqui é o acesso/edição.
export function PublicPageCard() {
  const { profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const code = profile?.referral_code;
  if (!code) return null;
  const link = `${window.location.origin}/i/${code}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); toast.success("Link copiado!"); setTimeout(() => setCopied(false), 1500); }
    catch { toast.error("Não deu pra copiar"); }
  };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: "Minha página no OnlyShop", url: link }); } catch { /* cancelado */ } }
    else copy();
  };

  const socials = [
    { icon: Instagram, on: !!profile?.instagram_username, label: "Instagram" },
    { icon: Music2, on: !!profile?.tiktok_username, label: "TikTok" },
    { icon: Youtube, on: !!profile?.youtube_username, label: "YouTube" },
    { icon: Globe, on: !!profile?.website, label: "Site" },
    { icon: Video, on: !!profile?.intro_video_url, label: "Vídeo" },
  ];
  const filled = socials.filter((s) => s.on).length;

  return (
    <div className="rounded-[1.5rem] bg-gradient-to-b from-primary/[0.14] to-transparent p-px animate-fade-in">
      <div className="rounded-[calc(1.5rem-1px)] bg-card/80 ring-1 ring-inset ring-white/[0.05] p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20"><Sparkles className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">Seu linktree</span>
            <h2 className="text-[15px] font-semibold tracking-tight">Sua página pública</h2>
            <p className="mt-0.5 text-xs text-muted-foreground/70">Cole esse link na sua bio. Quem clica vê seu vídeo, suas redes e te contrata direto por aqui.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <div className="flex-1 min-w-0 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08] px-3 py-2.5 text-xs text-white/80 truncate font-mono">{link}</div>
          <Button onClick={copy} size="icon" className="h-10 w-10 rounded-xl bg-gradient-primary border-0 shrink-0 active:scale-95">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {socials.map((s) => {
            const Icon = s.icon;
            return (
              <span key={s.label} className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] ring-1", s.on ? "bg-accent/10 text-accent ring-accent/20" : "bg-white/[0.02] text-muted-foreground/40 ring-white/[0.05]")}>
                <Icon className="h-3 w-3" /> {s.label}{s.on ? "" : " +"}
              </span>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <Button asChild variant="outline" className="rounded-xl h-10 gap-1.5 border-white/10 bg-white/[0.03] text-xs">
            <a href={link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /> Ver</a>
          </Button>
          <Button onClick={share} variant="outline" className="rounded-xl h-10 gap-1.5 border-white/10 bg-white/[0.03] text-xs">
            <Copy className="h-3.5 w-3.5" /> Compartilhar
          </Button>
          <Button asChild variant="outline" className="rounded-xl h-10 gap-1.5 border-white/10 bg-white/[0.03] text-xs">
            <Link to="/settings"><Pencil className="h-3.5 w-3.5" /> Editar</Link>
          </Button>
        </div>

        {filled < 3 && <p className="text-[11px] text-warning/80 mt-2.5 text-center">Preencha suas redes e um vídeo pra sua página brilhar ✨</p>}
      </div>
    </div>
  );
}
