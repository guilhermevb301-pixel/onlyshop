import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { setStoredRef } from "@/lib/referral";
import { getLevelInfo } from "@/hooks/useGamification";
import { useAuth } from "@/hooks/useAuth";
import { startConversation } from "@/lib/chat";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { HelpTip } from "@/components/ui/help-tip";
import {
  Loader2, MapPin, Star, ArrowRight, Sparkles, BadgeCheck,
  Instagram, Music2, Youtube, Globe, MessageCircle, ExternalLink, Briefcase,
} from "lucide-react";

interface Kit {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  niches: string[] | null;
  level: number | null;
  bio: string | null;
  instagram_username: string | null;
  tiktok_username: string | null;
  youtube_username: string | null;
  whatsapp: string | null;
  website: string | null;
  intro_video_url: string | null;
}

interface PortfolioItem {
  application_id: string;
  campaign_title: string | null;
  brand_name: string | null;
  reward_amount: number | null;
  posted_at: string | null;
  proofs: { links?: string[]; comment?: string } | null;
}

// Converte URL do YouTube/Vimeo em URL de embed (iframe). Senão, null.
function toEmbedUrl(url: string): string | null {
  try {
    const u = url.trim();
    const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const vm = u.match(/vimeo\.com\/(\d+)/);
    if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
    return null;
  } catch { return null; }
}

// Página pública de "media-kit / assessoria" — o link que o creator/embaixador põe
// na bio (onlyshopbrasil.com.br/i/CODIGO). Mostra o perfil dele + CTA. Quem se
// cadastra a partir daqui entra na REDE dele (referral).
export default function MediaKit() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [kit, setKit] = useState<Kit | null>(null);
  const [rating, setRating] = useState<{ avg: number; count: number } | null>(null);
  const [xp, setXp] = useState(0);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [contracting, setContracting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (code) setStoredRef(code); // atribui a rede no futuro cadastro
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles" as any)
          .select("user_id, display_name, username, avatar_url, city, state, niches, level, bio, instagram_username, tiktok_username, youtube_username, whatsapp, website, intro_video_url")
          .eq("referral_code", (code || "").toUpperCase())
          .maybeSingle();
        setKit((data as any) ?? null);
        if (data) {
          const uid = (data as any).user_id;
          const { data: r } = await supabase.from("ratings" as any).select("stars").eq("rated_user_id", uid);
          const arr = ((r as any[]) || []);
          if (arr.length) setRating({ avg: arr.reduce((s, x) => s + Number(x.stars), 0) / arr.length, count: arr.length });
          // Nível real (user_levels) — profiles.level é coluna morta (sempre 1).
          const { data: lvl } = await supabase.from("user_levels" as any).select("total_xp").eq("user_id", uid).maybeSingle();
          setXp(Number((lvl as any)?.total_xp ?? 0));
          // Portfólio de trabalhos (RPC pública, campos de vitrine).
          const { data: port } = await supabase.rpc("public_creator_portfolio" as any, { _user_id: uid });
          setPortfolio(((port as any[]) || []) as PortfolioItem[]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const name = kit?.display_name || kit?.username || "Este creator";
  const initial = (name[0] || "?").toUpperCase();
  const local = kit?.city ? `${kit.city}${kit.state ? `, ${kit.state}` : ""}` : null;
  const embed = kit?.intro_video_url ? toEmbedUrl(kit.intro_video_url) : null;
  const socials = (kit ? [
    kit.instagram_username && { icon: Instagram, label: "Instagram", url: `https://instagram.com/${kit.instagram_username.replace(/^@/, "")}` },
    kit.tiktok_username && { icon: Music2, label: "TikTok", url: `https://tiktok.com/@${kit.tiktok_username.replace(/^@/, "")}` },
    kit.youtube_username && { icon: Youtube, label: "YouTube", url: `https://youtube.com/@${kit.youtube_username.replace(/^@/, "")}` },
    kit.whatsapp && { icon: MessageCircle, label: "WhatsApp", url: `https://wa.me/${kit.whatsapp.replace(/\D/g, "")}` },
    kit.website && { icon: Globe, label: "Site", url: kit.website.startsWith("http") ? kit.website : `https://${kit.website}` },
  ] : []).filter(Boolean) as { icon: typeof Instagram; label: string; url: string }[];

  // "Me contrate": logado → abre chat com o creator; deslogado → cadastro (entra na rede dele).
  const handleContract = async () => {
    if (!kit) { navigate("/auth"); return; }
    if (!user) { navigate("/auth"); return; }
    if (user.id === kit.user_id) { navigate("/chat"); return; }
    setContracting(true);
    const cid = await startConversation(user.id, kit.user_id);
    setContracting(false);
    if (cid) navigate(`/chat?c=${cid}`);
    else toast.error("Não foi possível abrir a conversa agora");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambiente magenta ↔ cyan (DNA da marca) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full blur-[170px] opacity-[0.12] bg-primary" />
        <div className="absolute -bottom-44 right-1/4 w-[420px] h-[420px] rounded-full blur-[170px] opacity-[0.07] bg-accent" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 py-10">
        <div className="text-center mb-6 animate-fade-in">
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-semibold text-accent">
            <Sparkles className="h-3 w-3" /> OnlyShop · media-kit
          </span>
        </div>

        {/* Card do creator — double-bezel */}
        <div className="rounded-[1.75rem] bg-gradient-to-b from-white/[0.1] to-transparent p-px shadow-[0_24px_80px_-20px_hsl(346_100%_58%/0.3)] animate-slide-up">
          <div className="rounded-[1.65rem] bg-card/90 backdrop-blur-xl p-6 ring-1 ring-white/[0.05] text-center">
            {/* avatar */}
            <div className="mx-auto h-24 w-24 rounded-3xl ring-2 ring-primary/30 overflow-hidden bg-gradient-to-br from-primary/30 to-accent/10 flex items-center justify-center mb-4">
              {kit?.avatar_url ? (
                <img src={kit.avatar_url} alt={name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-black text-white/90">{initial}</span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center justify-center gap-1.5">
              {name}
              {kit && <BadgeCheck className="h-5 w-5 text-accent" />}
            </h1>
            {kit?.username && <p className="text-sm text-muted-foreground/70 mt-0.5">@{kit.username}</p>}

            {/* meta: local + nível + avaliação */}
            <div className="flex items-center justify-center flex-wrap gap-2 mt-4">
              {local && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] ring-1 ring-white/10 px-3 py-1 text-xs text-white/80">
                  <MapPin className="h-3 w-3 text-accent" /> {local}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 ring-1 ring-primary/20 px-3 py-1 text-xs text-primary">
                {getLevelInfo(xp).emoji} {getLevelInfo(xp).label}
              </span>
              {rating && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] ring-1 ring-white/10 px-3 py-1 text-xs text-white/80">
                  <Star className="h-3 w-3 text-warning fill-warning" /> {rating.avg.toFixed(1)} ({rating.count})
                </span>
              )}
            </div>

            {kit?.bio && <p className="text-sm text-white/60 mt-4 leading-relaxed">{kit.bio}</p>}

            {/* especialidades / nichos */}
            {kit?.niches && kit.niches.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 mt-4">
                {kit.niches.slice(0, 6).map((n) => (
                  <span key={n} className="text-[11px] rounded-full bg-white/[0.04] ring-1 ring-white/[0.06] px-2.5 py-1 text-white/70">{n}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Vídeo de apresentação */}
        {embed && (
          <div className="mt-4 rounded-2xl overflow-hidden ring-1 ring-white/[0.08] aspect-video bg-black animate-slide-up [animation-delay:60ms]">
            <iframe src={embed} title="Apresentação" className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        )}

        {/* Links sociais */}
        {socials.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-2 animate-slide-up [animation-delay:80ms]">
            {socials.map((s) => {
              const Icon = s.icon;
              return (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] ring-1 ring-white/[0.08] px-3 py-2 text-xs text-white/80 hover:text-accent hover:ring-accent/30 transition-colors">
                  <Icon className="h-3.5 w-3.5" /> {s.label}
                </a>
              );
            })}
          </div>
        )}

        {/* Trabalhos (portfólio) */}
        {portfolio.length > 0 && (
          <div className="mt-5 animate-slide-up [animation-delay:100ms]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-semibold flex items-center gap-1.5 mb-2"><Briefcase className="h-3 w-3" /> Trabalhos</p>
            <div className="space-y-2">
              {portfolio.slice(0, 6).map((p) => {
                const link = p.proofs?.links?.[0];
                const inner = (
                  <div className="flex items-center gap-2 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{p.campaign_title || "Campanha"}</p>
                      <p className="text-[11px] text-muted-foreground/60 truncate">{p.brand_name || "Marca"}</p>
                    </div>
                    {link && <ExternalLink className="h-3.5 w-3.5 text-accent shrink-0" />}
                  </div>
                );
                return link
                  ? <a key={p.application_id} href={link.startsWith("http") ? link : `https://${link}`} target="_blank" rel="noopener noreferrer">{inner}</a>
                  : <div key={p.application_id}>{inner}</div>;
              })}
            </div>
          </div>
        )}

        {/* CTA — me contrate / cadastrar (entra na rede dele) */}
        <div className="mt-5 space-y-2.5 animate-slide-up [animation-delay:120ms]">
          <Button onClick={handleContract} disabled={contracting} size="lg" className="group w-full h-13 rounded-2xl gap-2 bg-gradient-primary border-0 font-semibold text-base shadow-[var(--shadow-glow-cta)] active:scale-[.98] transition-transform">
            {contracting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {kit ? (user ? `Falar com ${name.split(" ")[0]}` : `Quero contratar ${name.split(" ")[0]}`) : "Entrar no OnlyShop"}
            <span className="grid place-items-center h-6 w-6 rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Button>
          <p className="text-center text-[11px] text-muted-foreground/50 flex items-center justify-center gap-1">
            {user ? "Fale direto e feche pela plataforma, com pagamento seguro." : "Crie sua conta grátis e contrate em minutos."}
            <HelpTip id="mediakit.contratar" className="h-4 w-4" iconClassName="h-3 w-3" />
          </p>
        </div>

        {/* rodapé */}
        <p className="text-center text-[10px] text-muted-foreground/30 mt-8">
          OnlyShop — o mapa da influência local · onlyshopbrasil.com.br
        </p>
      </div>
    </div>
  );
}
