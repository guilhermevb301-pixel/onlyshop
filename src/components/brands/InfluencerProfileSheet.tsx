import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Globe, User, Instagram, Music2, Youtube, MessageCircle, Home } from "lucide-react";
import type { CampaignApplication } from "@/lib/campaigns";

interface Props {
  application: CampaignApplication;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const fmtNum = (n: number) => Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n);

// Perfil read-only do influencer que aceitou a campanha — abre pelo card. Não
// escreve nada, não toca em aprovação/pagamento. Busca a avaliação média ao abrir.
export function InfluencerProfileSheet({ application, open, onOpenChange }: Props) {
  const inf = application.influencer;
  const uid = application.influencer_user_id;
  const [rating, setRating] = useState<{ avg: number; count: number } | null>(null);
  const [shipping, setShipping] = useState<any>(null);

  useEffect(() => {
    if (!open || !uid) { setRating(null); setShipping(null); return; }
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.from("ratings" as any).select("stars").eq("rated_user_id", uid);
        const arr = ((data as any[]) || []);
        if (alive && arr.length) setRating({ avg: arr.reduce((s, r) => s + Number(r.stars), 0) / arr.length, count: arr.length });
      } catch { /* degrada — sem avaliação */ }
      // Endereço de entrega — a RLS só devolve se esta marca tem candidatura aceita
      // deste afiliado (confidencial até a contratação).
      try {
        const { data: sh } = await supabase.from("affiliate_shipping" as any).select("*").eq("user_id", uid).maybeSingle();
        if (alive && sh) setShipping(sh);
      } catch { /* sem acesso/sem endereço */ }
    })();
    return () => { alive = false; };
  }, [open, uid]);

  const name = inf?.display_name || inf?.username || "Influencer";
  const local = inf?.city ? `${inf.city}${inf.state ? `, ${inf.state}` : ""}` : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[1.75rem] max-h-[88vh] overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>Perfil de {name}</SheetTitle>
        </SheetHeader>

        <div className="pt-2 pb-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16 ring-2 ring-primary/25">
              {inf?.avatar_url ? <AvatarImage src={inf.avatar_url} alt={name} /> : null}
              <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/10 text-lg font-bold">
                {name[0]?.toUpperCase() || <User className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">{name}</h2>
              {inf?.username && <p className="text-xs text-muted-foreground/60">@{inf.username}</p>}
              {local && <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3 text-accent" /> {local}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <Stat label="Nível" value={String(inf?.level ?? 1)} />
            <Stat label="Seguidores" value={inf?.followers_count != null ? fmtNum(inf.followers_count) : "—"} />
            <Stat label="Avaliação" value={rating ? `${rating.avg.toFixed(1)}★` : "—"} />
          </div>

          {/* Alcance real informado pelo creator (áudio 1: não precisa ser famoso) */}
          {(inf?.reach_estimate != null || inf?.avg_views != null) && (
            <>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {inf?.reach_estimate != null && <Stat label="alcança" value={inf.reach_estimate.toLocaleString("pt-BR")} />}
                {inf?.avg_views != null && <Stat label="views/post" value={inf.avg_views.toLocaleString("pt-BR")} />}
              </div>
              <p className="text-[10px] text-muted-foreground/40 text-center mt-1">alcance informado pelo creator</p>
            </>
          )}

          {inf?.bio && <p className="text-sm text-white/70 mt-4 leading-relaxed">{inf.bio}</p>}

          {inf?.niches && inf.niches.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {inf.niches.map((n) => (
                <span key={n} className="text-[11px] rounded-full bg-white/[0.04] ring-1 ring-white/[0.06] px-2.5 py-1 text-white/70">{n}</span>
              ))}
            </div>
          )}

          {/* Links sociais (a marca precisa ver quem é a pessoa no IG/TikTok/YouTube) */}
          {(inf?.instagram_username || inf?.tiktok_username || inf?.youtube_username || inf?.whatsapp || inf?.website) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {inf?.instagram_username && (
                <a href={`https://instagram.com/${inf.instagram_username.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs rounded-full bg-white/[0.04] ring-1 ring-white/[0.08] px-3 py-1.5 text-white/80 hover:text-accent">
                  <Instagram className="h-3.5 w-3.5" /> @{inf.instagram_username.replace(/^@/, "")}
                </a>
              )}
              {inf?.tiktok_username && (
                <a href={`https://tiktok.com/@${inf.tiktok_username.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs rounded-full bg-white/[0.04] ring-1 ring-white/[0.08] px-3 py-1.5 text-white/80 hover:text-accent">
                  <Music2 className="h-3.5 w-3.5" /> @{inf.tiktok_username.replace(/^@/, "")}
                </a>
              )}
              {inf?.youtube_username && (
                <a href={`https://youtube.com/@${inf.youtube_username.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs rounded-full bg-white/[0.04] ring-1 ring-white/[0.08] px-3 py-1.5 text-white/80 hover:text-accent">
                  <Youtube className="h-3.5 w-3.5" /> YouTube
                </a>
              )}
              {inf?.whatsapp && (
                <a href={`https://wa.me/${inf.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs rounded-full bg-white/[0.04] ring-1 ring-white/[0.08] px-3 py-1.5 text-white/80 hover:text-accent">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              )}
              {inf?.website && (
                <a href={inf.website.startsWith("http") ? inf.website : `https://${inf.website}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs rounded-full bg-white/[0.04] ring-1 ring-white/[0.08] px-3 py-1.5 text-white/80 hover:text-accent">
                  <Globe className="h-3.5 w-3.5" /> site
                </a>
              )}
            </div>
          )}

          {/* Endereço de entrega (liberado só porque este afiliado aceitou sua campanha) */}
          {shipping && (shipping.address_street || shipping.address_city) && (
            <div className="mt-4 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-3.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground/50 font-semibold flex items-center gap-1.5 mb-1.5"><Home className="h-3 w-3 text-accent" /> Endereço de entrega</p>
              <p className="text-xs text-white/80 leading-relaxed">
                {[shipping.address_street, shipping.address_number].filter(Boolean).join(", ")}
                {shipping.address_complement ? ` · ${shipping.address_complement}` : ""}<br />
                {[shipping.address_district, shipping.address_city, shipping.address_state].filter(Boolean).join(" · ")}
                {shipping.address_cep ? ` · CEP ${shipping.address_cep}` : ""}
              </p>
            </div>
          )}

          {!inf && <p className="text-sm text-muted-foreground/60 mt-4">Perfil ainda não disponível.</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] px-2 py-2.5 text-center">
      <p className="text-base font-black tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{label}</p>
    </div>
  );
}
