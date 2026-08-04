import { useState, useMemo, type ReactNode } from "react";
import type { Brand } from "@/hooks/useBrand";
import { type TeamMember, teamStatus, TEAM_STATUS_CFG, type TeamStatus, type PipelineStage } from "@/lib/campaigns";
import { scoreMember } from "@/lib/affiliateScore";
import { InfluencerProfileSheet } from "@/components/brands/InfluencerProfileSheet";
import { TeamMetricsPanel } from "@/components/brands/TeamMetricsPanel";
import { TeamRadar } from "@/components/brands/TeamRadar";
import { TeamPipeline } from "@/components/brands/TeamPipeline";
import { HelpTip } from "@/components/ui/help-tip";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users2, Package, TrendingUp, Star, MapPin, Instagram, Music2, Clock, ArrowUpDown, Loader2, CheckCircle2, Search, Tag as TagIcon, List, Columns3,
} from "lucide-react";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

type Sort = "score" | "ativos" | "aprovadas" | "pago" | "recente" | "avaliacao";
const SORTS: { k: Sort; label: string }[] = [
  { k: "score", label: "Score IA" },
  { k: "ativos", label: "Mais ativos" },
  { k: "aprovadas", label: "Aprovadas" },
  { k: "pago", label: "Total pago" },
  { k: "recente", label: "Recentes" },
  { k: "avaliacao", label: "Avaliação" },
];

type StatusFilter = "todos" | TeamStatus;
const STATUS_FILTERS: { k: StatusFilter; label: string }[] = [
  { k: "todos", label: "Todos" },
  { k: "ativo", label: "Ativos" },
  { k: "novo", label: "Novos" },
  { k: "inativo", label: "Inativos" },
];

// "Meu time" / CRM: a marca vê o roster + saúde da base, busca, filtra por status
// e etiqueta, e abre cada afiliado pra ver métricas, notas e tags. Nada de pagamento.
export function BrandTeamDashboard({ brand, members, loading, extraTop, extraBottom, onMetaChange, onMoveStage }: {
  brand: Brand; members: TeamMember[]; loading: boolean; extraTop?: ReactNode; extraBottom?: ReactNode;
  onMetaChange?: () => void; onMoveStage?: (userId: string, stage: PipelineStage) => void;
}) {
  const [sort, setSort] = useState<Sort>("score");
  const [statusF, setStatusF] = useState<StatusFilter>("todos");
  const [tagF, setTagF] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [mode, setMode] = useState<"lista" | "pipeline">("lista");

  // Todas as etiquetas em uso na base (pra virar chips de filtro).
  const allTags = useMemo(() => {
    const s = new Set<string>();
    members.forEach((m) => m.tags?.forEach((t) => s.add(t)));
    return [...s].sort();
  }, [members]);

  const view = useMemo(() => {
    const now = Date.now();
    const q = query.trim().toLowerCase();
    let arr = members.filter((m) => {
      if (statusF !== "todos" && teamStatus(m, now) !== statusF) return false;
      if (tagF && !(m.tags || []).includes(tagF)) return false;
      if (q) {
        const inf = m.influencer;
        const hay = [inf?.display_name, inf?.username, inf?.city, inf?.state, ...(inf?.niches || [])].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    arr = [...arr].sort((a, b) => {
      switch (sort) {
        case "score": return scoreMember(b, now).score - scoreMember(a, now).score;
        case "aprovadas": return b.approved - a.approved;
        case "pago": return b.totalPaid - a.totalPaid;
        case "recente": return (b.lastActivity || "").localeCompare(a.lastActivity || "");
        case "avaliacao": return (b.avgRating ?? 0) - (a.avgRating ?? 0);
        default: return b.deliveries - a.deliveries || b.approved - a.approved;
      }
    });
    return arr;
  }, [members, sort, statusF, tagF, query]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* header */}
      <div className="flex items-center gap-3 animate-fade-in">
        <div className="h-11 w-11 rounded-2xl bg-gradient-primary ring-1 ring-white/10 grid place-items-center shrink-0 shadow-[var(--shadow-glow-cta)]">
          <Users2 className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-semibold flex items-center gap-1">
            Meu time <HelpTip title="Meu time" body="Seu CRM de afiliados: quem já topou uma campanha sua vira parte do time. Acompanhe a saúde da base, filtre, etiquete e deixe notas internas de cada um." className="h-4 w-4" iconClassName="h-3 w-3" />
          </span>
          <h1 className="text-xl font-bold tracking-tight truncate">{brand.name}</h1>
        </div>
      </div>

      {/* dashboard de saúde da base */}
      <TeamMetricsPanel members={members} />

      {/* radar da IA: destaques + sugestões de ação */}
      <TeamRadar members={members} onSelect={setSelected} />

      {extraTop}

      {/* alterna lista ↔ pipeline (funil) */}
      {members.length > 0 && (
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] w-fit">
          {([["lista", "Lista", List], ["pipeline", "Pipeline", Columns3]] as const).map(([k, label, Icon]) => (
            <button
              key={k}
              onClick={() => setMode(k)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors",
                mode === k ? "bg-primary/15 text-primary" : "text-muted-foreground/50"
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      )}

      {/* PIPELINE (funil arrasta/menu) */}
      {mode === "pipeline" && members.length > 0 && onMoveStage && (
        <TeamPipeline members={members} onMove={onMoveStage} onSelect={setSelected} />
      )}

      {/* busca */}
      {mode === "lista" && members.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, cidade ou nicho…"
            className="w-full h-11 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] pl-10 pr-3 text-sm outline-none focus:ring-primary/30 placeholder:text-muted-foreground/40"
          />
        </div>
      )}

      {/* filtros de status */}
      {mode === "lista" && members.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.k}
              onClick={() => setStatusF(f.k)}
              className={cn(
                "shrink-0 text-xs px-3 py-1.5 rounded-full ring-1 transition-colors",
                statusF === f.k ? "bg-primary/15 text-primary ring-primary/30" : "bg-white/[0.03] text-muted-foreground/60 ring-white/[0.06]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* filtros de etiqueta (só se houver) */}
      {mode === "lista" && allTags.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          <TagIcon className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTagF(tagF === t ? null : t)}
              className={cn(
                "shrink-0 text-xs px-3 py-1.5 rounded-full ring-1 transition-colors",
                tagF === t ? "bg-accent/15 text-accent ring-accent/30" : "bg-white/[0.03] text-muted-foreground/60 ring-white/[0.06]"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* ordenação */}
      {mode === "lista" && members.length > 0 && (
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
      {mode === "lista" && (loading ? (
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
      ) : view.length === 0 ? (
        <div className="rounded-[1.25rem] bg-white/[0.03] ring-1 ring-white/[0.06] p-8 text-center">
          <p className="text-sm font-semibold text-muted-foreground/70">Nenhum afiliado nesse filtro</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Ajuste a busca ou os filtros acima.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {view.map((m) => <MemberCard key={m.user_id} m={m} onClick={() => setSelected(m)} />)}
        </div>
      ))}

      {extraBottom}

      {selected && (
        <InfluencerProfileSheet
          application={selected.sampleApplication}
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          brandId={brand.id}
          initialTags={selected.tags}
          initialNotes={selected.notes}
          onMetaSaved={onMetaChange}
        />
      )}
    </div>
  );
}

function MemberCard({ m, onClick }: { m: TeamMember; onClick: () => void }) {
  const inf = m.influencer;
  const name = inf?.display_name || inf?.username || "Afiliado";
  const initial = (name[0] || "?").toUpperCase();
  const local = inf?.city ? `${inf.city}${inf.state ? `, ${inf.state}` : ""}` : null;
  const last = m.lastActivity ? formatDistanceToNow(new Date(m.lastActivity), { addSuffix: true, locale: ptBR }) : null;
  const now = Date.now();
  const status = teamStatus(m, now);
  const scfg = TEAM_STATUS_CFG[status];
  const sc = scoreMember(m, now);

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
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-bold truncate">{name}</p>
              <span className={cn("shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ring-1", scfg.cls)}>{scfg.label}</span>
              <span className={cn("shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ring-1", sc.cls)} title={sc.label}>
                {sc.score}
              </span>
            </div>
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

        {/* etiquetas da marca */}
        {m.tags && m.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {m.tags.map((t) => (
              <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/12 text-accent ring-1 ring-accent/20">{t}</span>
            ))}
          </div>
        )}

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
