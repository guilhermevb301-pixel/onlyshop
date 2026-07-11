import { Crown } from "lucide-react";
import type { Territory } from "@/lib/campaigns";

const SCOPE_LABEL: Record<string, string> = { rua: "Rua", bairro: "Bairro", cidade: "Cidade", zona: "Zona" };

// Mostra os donos dos territórios por perto (dono da rua/bairro/cidade). Fundação
// do "domínio" — o visual completo do mapa vem depois. Retorna null se vazio.
export function TerritoryOwnerBar({ territories }: { territories: Territory[] }) {
  const owned = territories.filter((t) => t.owner_user_id).slice(0, 3);
  if (owned.length === 0) return null;
  return (
    <div className="rounded-[1.5rem] bg-white/[0.04] ring-1 ring-white/[0.08] p-px">
      <div className="rounded-[calc(1.5rem-1px)] bg-[#0a0a0c] p-3.5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-accent/70 font-semibold flex items-center gap-1.5 mb-2.5">
          <Crown className="h-3 w-3" /> Donos por aqui
        </p>
        <div className="space-y-2">
          {owned.map((t) => (
            <div key={t.id} className="flex items-center gap-2 text-xs">
              <span className="text-[10px] rounded-full bg-white/[0.05] ring-1 ring-white/[0.06] px-2 py-0.5 text-muted-foreground/70 shrink-0">
                {SCOPE_LABEL[t.scope] || t.scope} · {t.name}
              </span>
              <span className="font-semibold truncate">@{t.owner_username || t.owner_display_name || "dono"}</span>
              <span className="ml-auto text-[10px] text-accent tabular-nums shrink-0">{Math.round(Number(t.score))} pts 👑</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
