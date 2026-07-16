import { Link } from "react-router-dom";
import { useInfluencersNear } from "@/hooks/useInfluencersNear";
import { Users2, MapPin } from "lucide-react";

// "Creators perto de você" no mapa (áudio 3 do Biel: mostrar quem está próximo,
// clicar e ver o perfil). Clique vai pro linktree /i/CODIGO (ou /u/username).
export function InfluencersNearby({ lat, lon }: { lat?: number; lon?: number }) {
  const { influencers } = useInfluencersNear(lat, lon);
  if (influencers.length === 0) return null;
  return (
    <div className="rounded-[1.5rem] bg-white/[0.04] ring-1 ring-white/[0.08] p-px">
      <div className="rounded-[calc(1.5rem-1px)] bg-[#0a0a0c] p-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-primary/70 font-semibold flex items-center gap-1.5 mb-2.5">
          <Users2 className="h-3.5 w-3.5" /> Creators perto de você
        </p>
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          {influencers.map((inf) => {
            const to = inf.referral_code ? `/i/${inf.referral_code}` : inf.username ? `/u/${inf.username}` : null;
            const name = inf.display_name || inf.username || "Creator";
            const initial = (name[0] || "?").toUpperCase();
            const card = (
              <div className="flex flex-col items-center gap-1.5 w-16 shrink-0">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/10 ring-1 ring-white/10 grid place-items-center overflow-hidden">
                  {inf.avatar_url ? <img src={inf.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="text-lg font-bold text-white/90">{initial}</span>}
                </div>
                <span className="text-[10px] text-white/70 truncate w-full text-center">{name.split(" ")[0]}</span>
                {inf.distance_km != null && (
                  <span className="text-[9px] text-muted-foreground/40 flex items-center gap-0.5"><MapPin className="h-2 w-2" />{Math.round(inf.distance_km)}km</span>
                )}
              </div>
            );
            return to
              ? <Link key={inf.user_id} to={to} className="active:scale-95 transition-transform">{card}</Link>
              : <div key={inf.user_id}>{card}</div>;
          })}
        </div>
      </div>
    </div>
  );
}
