import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Calendar, ExternalLink, MessageCircle, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { fmtKm } from "@/lib/campaigns";
import type { CampaignApplication } from "@/lib/campaigns";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS: Record<string, { label: string; class: string }> = {
  accepted: { label: "Aguardando entrega", class: "bg-warning/15 text-warning" },
  delivered: { label: "Em análise", class: "bg-accent/15 text-accent" },
  approved: { label: "Aprovado", class: "bg-primary/15 text-primary" },
  paid: { label: "Pago", class: "bg-accent/20 text-accent" },
};

// Detalhe de uma campanha/entrega: dia publicado, o print/comprovante enviado,
// status, valor + conversar (pedido do Biel — antes só via o link do post).
export function CampaignDeliverySheet({ application, open, onOpenChange }: {
  application: CampaignApplication | null; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  if (!application) return null;
  const a = application;
  const cfg = STATUS[a.status] ?? STATUS.accepted;
  const links = (a.proofs?.links?.filter(Boolean) ?? (a.delivery_url ? [a.delivery_url] : [])) as string[];
  const posted = a.posted_at ? format(new Date(a.posted_at), "dd 'de' MMMM", { locale: ptBR }) : null;
  const value = Number(a.campaign?.reward_amount ?? 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>{a.campaign?.title ?? "Campanha"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className={cn("rounded-full border-0 gap-1 px-3 py-1 text-xs font-semibold", cfg.class)}>{cfg.label}</Badge>
            {value > 0 && <span className="text-sm font-black text-accent tabular-nums">{brl(value)}</span>}
          </div>

          {a.campaign?.brand_name && (
            <p className="text-sm text-muted-foreground/70">Marca: <span className="text-foreground font-medium">{a.campaign.brand_name}</span></p>
          )}
          {posted && (
            <p className="text-sm flex items-center gap-2 text-muted-foreground/70"><Calendar className="h-4 w-4 text-accent" /> Publicado em {posted}</p>
          )}
          {a.distance_km != null && (
            <p className="text-sm flex items-center gap-2 text-muted-foreground/70"><MapPin className="h-4 w-4 text-accent" /> {fmtKm(a.distance_km)}</p>
          )}

          {links.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/50 mb-2">Comprovante enviado</p>
              <div className="space-y-2">
                {links.map((l, i) => (
                  <a key={i} href={l.startsWith("http") ? l : `https://${l}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08] px-3 py-2.5 text-sm text-white/80 hover:text-accent transition-colors">
                    <ExternalLink className="h-4 w-4 shrink-0" /> <span className="truncate">{l}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          {a.proofs?.comment && (
            <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] p-3 text-sm text-white/80">{a.proofs.comment}</div>
          )}

          <Button asChild variant="outline" className="w-full rounded-full h-11 gap-2 border-white/10 bg-white/[0.03]">
            <Link to="/chat"><MessageCircle className="h-4 w-4" /> Conversar sobre esta campanha</Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
