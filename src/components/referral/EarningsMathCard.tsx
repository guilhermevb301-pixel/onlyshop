import { TrendingUp } from "lucide-react";

// A matemática da indicação em destaque ("brilha o olho" — pedido do Biel).
// Números de exemplo são rotulados como projeção, NUNCA como saldo real.
export function EarningsMathCard() {
  return (
    <div className="rounded-[1.5rem] bg-gradient-to-b from-accent/20 to-transparent p-px shadow-[0_20px_60px_-24px_hsl(174_100%_47%/0.3)]">
      <div className="rounded-[calc(1.5rem-1px)] bg-[#0a0a0c] p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-accent/70 font-semibold flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" /> Como você ganha
        </p>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="rounded-2xl bg-accent/[0.07] ring-1 ring-accent/20 p-4 text-center">
            <p className="text-3xl font-black text-accent tabular-nums">33%</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1 leading-snug">da <b>1ª compra</b> de cada empresa que você trouxer</p>
          </div>
          <div className="rounded-2xl bg-primary/[0.07] ring-1 ring-primary/20 p-4 text-center">
            <p className="text-3xl font-black text-primary tabular-nums">5%</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1 leading-snug">de tudo que ela gastar, <b>pra sempre</b></p>
          </div>
        </div>
        <p className="text-[11px] text-white/70 mt-3 leading-relaxed">
          Traga <b className="text-accent">10 empresas</b> gastando R$ 500/mês cada → <b className="text-accent">~R$ 250/mês</b> no automático, todo mês.
          <span className="text-muted-foreground/40"> (exemplo)</span>
        </p>
      </div>
    </div>
  );
}
