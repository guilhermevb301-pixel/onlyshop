import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { ActivityEvent } from "@/hooks/useActivity";
import { activityIcon, activityText } from "@/lib/activity-text";

export function ActivityFeed({ events, loading }: { events: ActivityEvent[]; loading: boolean }) {
  if (loading && events.length === 0) {
    return <div className="py-16 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" /></div>;
  }
  if (events.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-border/40 bg-card/30 py-12 px-6 text-center">
        <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <p className="mt-4 text-base font-bold">O mural tá começando</p>
        <p className="mx-auto mt-1.5 max-w-xs text-xs text-muted-foreground/60 leading-relaxed">
          Campanhas feitas, quem subiu de nível e os donos de cada rua aparecem aqui, ao vivo.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {events.map((e) => {
        const cfg = activityIcon(e.type);
        const Icon = cfg.icon;
        const name = e.actor?.display_name || e.actor?.username || "?";
        return (
          <div key={e.id} className="rounded-[1.5rem] bg-white/[0.04] ring-1 ring-white/[0.08] p-px">
            <div className="rounded-[calc(1.5rem-1px)] bg-[#0a0a0c] p-3.5 flex items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                {e.actor?.avatar_url ? <AvatarImage src={e.actor.avatar_url} alt="" /> : null}
                <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/10 text-xs font-bold">{name[0]?.toUpperCase() || "?"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white/85 leading-snug">{activityText(e)}</p>
                <p className="text-[10px] text-muted-foreground/45 mt-0.5">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: ptBR })}</p>
              </div>
              <span className={cn("h-8 w-8 rounded-full grid place-items-center bg-white/[0.04] ring-1 ring-white/[0.06] shrink-0", cfg.color)}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
