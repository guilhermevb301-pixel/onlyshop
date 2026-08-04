import { useMemo } from "react";
import type { TeamMember } from "@/lib/campaigns";
import { scoreMember, type Tier } from "@/lib/affiliateScore";
import { HelpTip } from "@/components/ui/help-tip";
import { Sparkles, ChevronRight, Trophy, AlertTriangle, MoonStar } from "lucide-react";

// Radar da IA: em vez de só listar, aponta AÇÕES. Puxa quem vale premiar (top) e
// quem vale resgatar (atenção/inativo) com a sugestão pronta — a dor do Biel de
// "a marca não fica no ar, perdida manualmente".
const ICON: Partial<Record<Tier, typeof Trophy>> = { top: Trophy, attention: AlertTriangle, inactive: MoonStar };
const PRIORITY: Record<Tier, number> = { top: 0, attention: 1, inactive: 2, potential: 3, growing: 4 };

export function TeamRadar({ members, onSelect }: { members: TeamMember[]; onSelect: (m: TeamMember) => void }) {
  const picks = useMemo(() => {
    const now = Date.now();
    const scored = members.map((m) => ({ m, s: scoreMember(m, now) }));
    // Só tiers acionáveis; prioriza premiar + resgatar; no máx. 4.
    return scored
      .filter((x) => x.s.tier === "top" || x.s.tier === "attention" || x.s.tier === "inactive")
      .sort((a, b) => PRIORITY[a.s.tier] - PRIORITY[b.s.tier] || b.s.score - a.s.score)
      .slice(0, 4);
  }, [members]);

  if (picks.length === 0) return null;

  return (
    <div className="rounded-[1.25rem] bg-gradient-to-b from-primary/[0.08] to-transparent p-px animate-slide-up">
      <div className="rounded-[calc(1.25rem-1px)] bg-card/80 ring-1 ring-inset ring-primary/10 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 flex items-center gap-1.5 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Radar da IA
          <HelpTip title="Radar da IA" body="Uma pontuação de 0 a 100 por afiliado, calculada em cima do que ele entregou, da avaliação e de quão ativo está. A IA aponta quem premiar e quem resgatar — com a ação sugerida." className="h-4 w-4" iconClassName="h-3 w-3" />
        </p>
        <div className="space-y-2">
          {picks.map(({ m, s }) => {
            const inf = m.influencer;
            const name = inf?.display_name || inf?.username || "Afiliado";
            const Icon = ICON[s.tier] ?? Sparkles;
            return (
              <button
                key={m.user_id}
                onClick={() => onSelect(m)}
                className="w-full text-left flex items-center gap-3 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-3 active:scale-[.99] transition-transform"
              >
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ring-1 ${s.cls}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold truncate">{name}</p>
                    <span className="shrink-0 text-[10px] font-black tabular-nums text-muted-foreground/50">{s.score}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70 leading-snug line-clamp-2">{s.suggestion}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
