import { useMemo, type ReactNode } from "react";
import type { TeamMember } from "@/lib/campaigns";
import { teamStatus } from "@/lib/campaigns";
import { HelpTip } from "@/components/ui/help-tip";
import { Users2, Activity, MoonStar, Sparkles, Package, TrendingUp } from "lucide-react";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// Dashboard do CRM: a saúde da base de afiliados de relance. TUDO derivado de
// dados reais (campanhas/candidaturas) — não há tracking de vendas/GMV, então
// esses não aparecem aqui (não se inventa número de dinheiro).
export function TeamMetricsPanel({ members }: { members: TeamMember[] }) {
  const m = useMemo(() => {
    const now = Date.now();
    const d = new Date();
    const mesAtual = d.getMonth(), anoAtual = d.getFullYear();
    let ativos = 0, novos = 0, inativos = 0, novosMes = 0, entregas = 0, pago = 0;
    for (const x of members) {
      const s = teamStatus(x, now);
      if (s === "ativo") ativos++; else if (s === "novo") novos++; else inativos++;
      if (x.joinedAt) {
        const j = new Date(x.joinedAt);
        if (j.getMonth() === mesAtual && j.getFullYear() === anoAtual) novosMes++;
      }
      entregas += x.deliveries;
      pago += x.totalPaid;
    }
    return { total: members.length, ativos, novos, inativos, novosMes, entregas, pago };
  }, [members]);

  if (m.total === 0) return null;

  // Barra de saúde: status é palette reservada + SEMPRE com rótulo (nunca cor só).
  const seg = [
    { k: "ativo", n: m.ativos, label: "Ativos", fill: "bg-emerald-400", text: "text-emerald-400" },
    { k: "novo", n: m.novos, label: "Novos", fill: "bg-accent", text: "text-accent" },
    { k: "inativo", n: m.inativos, label: "Inativos", fill: "bg-white/25", text: "text-muted-foreground/70" },
  ].filter((s) => s.n > 0);

  return (
    <div className="space-y-3 animate-slide-up">
      {/* KPIs — números reais, texto em ink (não na cor da série) */}
      <div className="grid grid-cols-3 gap-2.5">
        <Kpi icon={<Users2 className="h-4 w-4 text-primary" />} value={m.total} label="afiliados" />
        <Kpi icon={<Activity className="h-4 w-4 text-emerald-400" />} value={m.ativos} label="ativos" />
        <Kpi icon={<MoonStar className="h-4 w-4 text-muted-foreground/60" />} value={m.inativos} label="inativos" />
        <Kpi icon={<Sparkles className="h-4 w-4 text-accent" />} value={m.novosMes} label="novos no mês" />
        <Kpi icon={<Package className="h-4 w-4 text-primary" />} value={m.entregas} label="conteúdos" />
        <Kpi icon={<TrendingUp className="h-4 w-4 text-accent" />} value={brl(m.pago)} label="pago" highlight />
      </div>

      {/* Barra de saúde da base */}
      <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 flex items-center gap-1">
            Saúde da base
            <HelpTip title="Saúde da base" body="Novo = entrou nas últimas 2 semanas. Ativo = teve movimento no último mês. Inativo = mais de 30 dias parado. Um afiliado inativo é candidato a campanha de reativação." className="h-4 w-4" iconClassName="h-3 w-3" />
          </span>
          <span className="text-[11px] text-muted-foreground/50 tabular-nums">{m.total} no total</span>
        </div>
        <div className="flex gap-[2px] h-3 rounded-full overflow-hidden" role="img" aria-label={`Ativos ${m.ativos}, novos ${m.novos}, inativos ${m.inativos}`}>
          {seg.map((s) => (
            <div key={s.k} className={`${s.fill} h-full first:rounded-l-full last:rounded-r-full`} style={{ width: `${(s.n / m.total) * 100}%` }} title={`${s.label}: ${s.n}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
          {seg.map((s) => (
            <span key={s.k} className="inline-flex items-center gap-1.5 text-[11px]">
              <span className={`h-2 w-2 rounded-full ${s.fill}`} />
              <span className="text-muted-foreground/70">{s.label}</span>
              <span className={`font-bold tabular-nums ${s.text}`}>{s.n}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, value, label, highlight }: { icon: ReactNode; value: ReactNode; label: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl px-3 py-3 ring-1 ${highlight ? "bg-accent/[0.07] ring-accent/20" : "bg-white/[0.03] ring-white/[0.06]"}`}>
      <div className="flex items-center gap-1.5">{icon}
        <span className={`tabular-nums font-black ${highlight ? "text-base text-accent" : "text-lg text-foreground/90"}`}>{value}</span>
      </div>
      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{label}</p>
    </div>
  );
}
