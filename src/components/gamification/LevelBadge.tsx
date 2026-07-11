import { getLevelInfo } from "@/hooks/useGamification";
import { cn } from "@/lib/utils";

interface Props {
  totalXp: number;
  showBar?: boolean;
  className?: string;
}

// Chip de nível compartilhado: emoji + tier (Bronze..Elite) + XP, com barra de
// progresso opcional pro próximo nível. Deriva tudo de getLevelInfo (fonte única).
export function LevelBadge({ totalXp, showBar, className }: Props) {
  const info = getLevelInfo(totalXp);
  return (
    <div className={cn("inline-flex flex-col gap-1.5", className)}>
      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 w-fit", info.bg, info.ring, info.textColor)}>
        <span>{info.emoji}</span> {info.label}
        <span className="text-muted-foreground/50 font-normal tabular-nums">· {totalXp.toLocaleString("pt-BR")} XP</span>
      </span>
      {showBar && info.nextLevel && (
        <div className="w-44 max-w-full">
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div className={cn("h-full rounded-full bg-gradient-to-r", info.color)} style={{ width: `${info.progress}%` }} />
          </div>
          <p className="text-[9px] text-muted-foreground/50 mt-1">
            {Math.max(0, info.nextLevel.minXp - totalXp).toLocaleString("pt-BR")} XP pro {info.nextLevel.label}
          </p>
        </div>
      )}
    </div>
  );
}
