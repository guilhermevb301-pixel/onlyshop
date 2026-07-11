import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { setStoredRef } from "@/lib/referral";
import { getLevelInfo } from "@/hooks/useGamification";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Star, ArrowRight, Sparkles, BadgeCheck } from "lucide-react";

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
}

// Página pública de "media-kit / assessoria" — o link que o creator/embaixador põe
// na bio (onlyshopbrasil.com.br/i/CODIGO). Mostra o perfil dele + CTA. Quem se
// cadastra a partir daqui entra na REDE dele (referral).
export default function MediaKit() {
  const { code } = useParams();
  const [kit, setKit] = useState<Kit | null>(null);
  const [rating, setRating] = useState<{ avg: number; count: number } | null>(null);
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (code) setStoredRef(code); // atribui a rede no futuro cadastro
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles" as any)
          .select("user_id, display_name, username, avatar_url, city, state, niches, level, bio")
          .eq("referral_code", (code || "").toUpperCase())
          .maybeSingle();
        setKit((data as any) ?? null);
        if (data) {
          const { data: r } = await supabase.from("ratings" as any).select("stars").eq("rated_user_id", (data as any).user_id);
          const arr = ((r as any[]) || []);
          if (arr.length) setRating({ avg: arr.reduce((s, x) => s + Number(x.stars), 0) / arr.length, count: arr.length });
          // Nível real (user_levels) — profiles.level é coluna morta (sempre 1).
          const { data: lvl } = await supabase.from("user_levels" as any).select("total_xp").eq("user_id", (data as any).user_id).maybeSingle();
          setXp(Number((lvl as any)?.total_xp ?? 0));
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

        {/* CTA — contratar / cadastrar (entra na rede dele) */}
        <div className="mt-5 space-y-2.5 animate-slide-up [animation-delay:80ms]">
          <Button asChild size="lg" className="group w-full h-13 rounded-2xl gap-2 bg-gradient-primary border-0 font-semibold text-base shadow-[var(--shadow-glow-cta)] active:scale-[.98] transition-transform">
            <Link to="/auth">
              {kit ? `Quero contratar ${name.split(" ")[0]}` : "Entrar no OnlyShop"}
              <span className="grid place-items-center h-6 w-6 rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </Button>
          <p className="text-center text-[11px] text-muted-foreground/50">
            Crie sua conta grátis, encontre creators perto de você e contrate em minutos.
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
