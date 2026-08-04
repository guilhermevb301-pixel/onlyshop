import { useTeamAnnouncements } from "@/hooks/useTeamAnnouncements";
import { Megaphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// Feed do afiliado: os avisos que as marcas do time dele mandaram (broadcast).
// A RLS já filtra só as marcas em que ele é membro ativo. Some se não houver nada.
export function AffiliateAnnouncementsFeed() {
  const { items, loading } = useTeamAnnouncements();
  if (loading || items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="h-8 w-8 rounded-xl bg-primary/12 ring-1 ring-primary/20 grid place-items-center">
          <Megaphone className="h-4 w-4 text-primary" />
        </span>
        <div>
          <h2 className="text-sm font-bold tracking-tight">Avisos das suas marcas</h2>
          <p className="text-[11px] text-muted-foreground/50">recados e briefings de quem você trabalha</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {items.slice(0, 6).map((a) => (
          <div key={a.id} className="rounded-[1.25rem] bg-white/[0.03] ring-1 ring-white/[0.06] p-3.5">
            <div className="flex items-center justify-between gap-2">
              {a.brand_name && <span className="text-[10px] font-bold uppercase tracking-wide text-accent truncate">{a.brand_name}</span>}
              <span className="text-[10px] text-muted-foreground/35 shrink-0">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}</span>
            </div>
            {a.title && <p className="text-sm font-bold mt-1">{a.title}</p>}
            <p className="text-xs text-muted-foreground/75 leading-snug mt-0.5 whitespace-pre-wrap">{a.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
