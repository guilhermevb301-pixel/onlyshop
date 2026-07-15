import { Network } from "lucide-react";

// Teaser da rede de afiliados (afiliado que traz afiliado). Ainda não paga —
// rotulado "em breve" pra não prometer o que não existe.
export function SubnetworkTeaser() {
  return (
    <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-4 flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-primary/10 ring-1 ring-primary/20 grid place-items-center shrink-0">
        <Network className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          Rede de afiliados
          <span className="text-[9px] uppercase tracking-wide bg-primary/15 text-primary rounded-full px-1.5 py-0.5">em breve</span>
        </p>
        <p className="text-[11px] text-muted-foreground/60 leading-snug">Em breve você também ganha por cada creator que trouxer pra plataforma.</p>
      </div>
    </div>
  );
}
