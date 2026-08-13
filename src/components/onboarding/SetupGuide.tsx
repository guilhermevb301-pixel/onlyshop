import { useState } from "react";
import { Link } from "react-router-dom";
import { type SetupStep, setupProgress } from "@/lib/setupSteps";
import { CheckCircle2, ArrowRight, Rocket, X, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";

// Guia de primeiros passos — mostra o PRÓXIMO passo em destaque e recolhe o resto.
// Some sozinho quando tudo está feito (ou quando o usuário fecha). O estado de
// cada passo é real; nada é decorativo.
export function SetupGuide({ steps, storageKey, title = "Comece por aqui" }: {
  steps: SetupStep[]; storageKey: string; title?: string;
}) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(storageKey) === "1"; } catch { return false; }
  });
  const { done, total, pct, allDone, next } = setupProgress(steps);

  if (dismissed) return null;

  const close = () => { try { localStorage.setItem(storageKey, "1"); } catch { /* ok */ } setDismissed(true); };

  // Tudo pronto: comemora uma vez e oferece fechar.
  if (allDone) {
    return (
      <div className="animate-slide-up rounded-[1.5rem] bg-gradient-to-b from-emerald-500/[0.1] to-transparent p-px">
        <div className="rounded-[calc(1.5rem-1px)] bg-card/80 ring-1 ring-inset ring-emerald-500/15 p-4 flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-500/25">
            <PartyPopper className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Tudo pronto! 🎉</p>
            <p className="text-xs text-muted-foreground/60">Sua conta está configurada. Bom trabalho.</p>
          </div>
          <button onClick={close} className="shrink-0 p-1.5 text-muted-foreground/40 hover:text-foreground rounded-lg" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up rounded-[1.5rem] bg-gradient-to-b from-primary/[0.1] to-transparent p-px">
      <div className="rounded-[calc(1.5rem-1px)] bg-card/80 ring-1 ring-inset ring-primary/12 p-4">
        {/* header + progresso */}
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-primary text-white shadow-[var(--shadow-glow-cta)]">
            <Rocket className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight">{title}</p>
            <p className="text-[11px] text-muted-foreground/50">{done} de {total} concluído</p>
          </div>
          <button onClick={close} className="shrink-0 p-1.5 text-muted-foreground/30 hover:text-muted-foreground/60 rounded-lg" aria-label="Dispensar">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* barra */}
        <div className="mt-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full rounded-full bg-gradient-primary transition-[width] duration-700 ease-out" style={{ width: `${Math.max(4, pct)}%` }} />
        </div>

        {/* passos */}
        <div className="mt-4 space-y-1.5">
          {steps.map((s, i) => {
            const isNext = next?.key === s.key;
            return (
              <div
                key={s.key}
                className={cn(
                  "rounded-2xl transition-colors",
                  isNext ? "bg-white/[0.04] ring-1 ring-primary/20 p-3" : "px-3 py-2",
                )}
                style={isNext ? undefined : { animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ring-1",
                    s.done ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25"
                      : isNext ? "bg-primary/15 text-primary ring-primary/30" : "bg-white/[0.03] text-muted-foreground/40 ring-white/10",
                  )}>
                    {s.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <p className={cn("text-sm min-w-0 flex-1 truncate", s.done ? "text-muted-foreground/45 line-through" : isNext ? "font-bold" : "text-muted-foreground/70")}>
                    {s.title}
                  </p>
                  {isNext && (
                    <Link
                      to={s.to}
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold bg-gradient-primary text-white px-3 py-1.5 rounded-full active:scale-[.97] transition-transform"
                    >
                      {s.cta} <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                {isNext && <p className="text-[11px] text-muted-foreground/60 mt-1.5 pl-8 leading-snug">{s.desc}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
