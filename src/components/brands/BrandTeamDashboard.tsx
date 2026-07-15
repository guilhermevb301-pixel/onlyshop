import { useState, useMemo, type ReactNode } from "react";
import type { Brand } from "@/hooks/useBrand";
import type { TeamMember } from "@/lib/campaigns";
import { InfluencerProfileSheet } from "@/components/brands/InfluencerProfileSheet";
import { HelpTip } from "@/components/ui/help-tip";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users2, Package, TrendingUp, Star, MapPin, Instagram, Music2, Clock, ArrowUpDown, Loader2, CheckCircle2,
} from "lucide-react";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

type Sort = "ativos" | "aprovadas" | "pago" | "recente" | "avaliacao";
const SORTS: { k: Sort; label: string }[] = [
  { k: "ativos", label: "Mais ativos" },
  { k: "aprovadas", label: "Aprovadas" },
  { k: "pago", label: "Total pago" },
  { k: "recente", label: "Recentes" },
  { k: "avaliacao", label: "Avaliação" },
];

// "Meu time" (Fase 2): a marca vê seu roster de afiliados + métricas de quem
// trabalha mais. Tudo derivado de campaign_applications — nada de pagamento.
export function BrandTeamDashboard({ brand, members, loading, extraTop, extraBottom }: {
  brand: Brand; members: TeamMember[]; loading: boolean; extraTop?: ReactNode; extraBottom?: ReactNode;
}) {
  const [sort, setSort] = useState<Sort>("ativos");
  const [selected, setSelected] = useState<TeamMember | null>(null);

  const sorted = useMemo(() => {
    const arr = [...members];
    arr.sort((a, b) => {
      switch (sort) {
        case "aprovadas": return b.approved - a.approved;
        case "pago": return b.totalPaid - a.totalPaid;
        case "recente": return (b.lastActivity || "").localeCompare(a.lastActivity || "");
        case "avaliacao": return (b.avgRating ?? 0) - (a.avgRating ?? 0);
        default: return b.deliveries - a.deliveries || b.approved - a.approved;
      }
    });
    return arr;
  }, [members, sort]);

  const totalPaid = members.reduce((s, m) => s + m.totalPaid, 0);
  const totalDeliveries = members.reduce((s, m) => s + m.deliveries, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* header */}
      <div className="flex items-center gap-3 animate-fade-in">
        <div className="h-11 w-11 rounded-2xl bg-gradient-primary ring-1 ring-white/10 grid place-items-center shrink-0 shadow-[var(--shadow-glow-cta)]">
          <Users2 className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-semibold flex items-center gap-1">
            Meu time <HelpTip title="Meu time" body="Todo mundo que já topou uma campanha sua vira parte do seu time aqui. Veja quem trabalha mais, quanto já pagou e a avaliação de cada um." className="h-4 w-4" iconClassName="h-3 w-3" />
          </span>
          <h1 className="text-xl font-bold tracking-tight truncate">{brand.name}</h1>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 gap-2.5 animate-slide-up">
        <Stat icon={<Users2 className="h-4 w-4 text-accent" />} value={members.length} label="afiliados" />
        <Stat icon={<Package className="h-4 w-4 text-primary" />} value={totalDeliveries} label="entregas" />
        <Stat icon={<TrendingUp className="h-4 w-4 text-accent" />} value={brl(totalPaid)} label="pago" highlight />
      </div>

      {extraTop}

      {/* ordenação */}
      {members.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
          {SORTS.map((s) => (
            <button
              key={s.k}
              onClick={() => setSort(s.k)}
              className={cn(
                "shrink-0 text-xs px-3 py-1.5 rounded-full ring-1 transition-colors",
                sort === s.k ? "bg-primary/15 text-primary ring-primary/30" : "bg-white/[0.03] text-muted-foreground/60 ring-white/[0.06]"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* lista */}
      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" /></div>
      ) : members.length === 0 ? (
        <div className="rounded-[1.25rem] bg-white/[0.03] ring-1 ring-white/[0.06] p-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center mb-3">
            <Users2 className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-bold">Seu time começa nas campanhas</p>
          <p className="text-xs text-muted-foreground/60 mt-1.5 max-w-xs mx-auto leading-relaxed">
            Quem topar uma campanha sua aparece aqui com as métricas de trabalho. Crie campanhas ou convide afiliados pra montar seu time.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((m) => <MemberCard key={m.user_id} m={m} onClick={() => setSelected(m)} />)}
        </div>
      )}

      {extraBottom}

      {selected && (
        <InfluencerProfileSheet application={selected.sampleApplication} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
      )}
    </div>
  );
}

function Stat({ icon, value, label, highlight }: { icon: ReactNode; value: ReactNode; label: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-2xl px-3 py-3 text-center ring-1", highlight ? "bg-accent/[0.07] ring-accent/20" : "bg-white/[0.03] ring-white/[0.06]")}>
      <div className="flex items-center justify-center gap-1">{icon}
        <span className={cn("tabular-nums font-black", highlight ? "text-base text-accent" : "text-lg text-foreground/90")}>{value}</span>
      </div>
      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{label}</p>
    </div>
  );
}

function MemberCard({ m, onClick }: { m: TeamMember; onClick: () => void }) {
  const inf = m.influencer;
  const name = inf?.display_name || inf?.username || "Afiliado";
  const initial = (name[0] || "?").toUpperCase();
  const local = inf?.city ? `${inf.city}${inf.state ? `, ${inf.state}` : ""}` : null;
  const last = m.lastActivity ? formatDistanceToNow(new Date(m.lastActivity), { addSuffix: true, locale: ptBR }) : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-[1.25rem] bg-gradient-to-b from-white/[0.06] to-transparent p-px active:scale-[.99] transition-transform"
    >
      <div className="rounded-[calc(1.25rem-1px)] bg-card/80 ring-1 ring-inset ring-white/[0.04] p-3.5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/10 ring-1 ring-white/[0.06] grid place-items-center shrink-0 overflow-hidden">
            {inf?.avatar_url ? <img src={inf.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="text-base font-bold text-white/90">{initial}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate">{name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {local && <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/60"><MapPin className="h-2.5 w-2.5" /> {local}</span>}
              {inf?.instagram_username && <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/60"><Instagram className="h-2.5 w-2.5" /> {inf.instagram_username}</span>}
              {inf?.tiktok_username && <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/60"><Music2 className="h-2.5 w-2.5" /> {inf.tiktok_username}</span>}
            </div>
          </div>
          {m.avgRating != null && (
            <span className="inline-flex items-center gap-0.5 text-xs text-warning shrink-0">
              <Star className="h-3 w-3 fill-warning" /> {m.avgRating.toFixed(1)}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <Metric icon={<Package className="h-3 w-3" />} value={m.deliveries} label="entregas" />
          <Metric icon={<CheckCircle2 className="h-3 w-3" />} value={m.approved} label="aprovadas" />
          <Metric icon={<TrendingUp className="h-3 w-3" />} value={brl(m.totalPaid)} label="pago" />
        </div>
        {last && (
          <p className="text-[10px] text-muted-foreground/40 mt-2 flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> ativo {last}</p>
        )}
      </div>
    </button>
  );
}

function Metric({ icon, value, label }: { icon: ReactNode; value: ReactNode; label: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/[0.05] px-2 py-1.5 text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground/70">{icon}
        <span className="tabular-nums font-bold text-xs text-foreground/85">{value}</span>
      </div>
      <p className="text-[9px] text-muted-foreground/50 mt-0.5">{label}</p>
    </div>
  );
}
