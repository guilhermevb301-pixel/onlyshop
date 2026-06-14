import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCampaignApplications } from "@/hooks/useCampaignApplications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, MapPin, Send, Loader2, CheckCircle, Clock, Hourglass,
  CircleDollarSign, ExternalLink, Sparkles, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import type { ApplicationStatus, CampaignApplication } from "@/lib/campaigns";

// Status que entram na lista "Minhas campanhas" (filtra fora applied/rejected).
const VISIBLE: ApplicationStatus[] = ["accepted", "delivered", "approved", "paid"];

// Aparência de cada status na timeline da candidatura.
const STATUS_CFG: Record<string, { label: string; icon: typeof Clock; class: string }> = {
  accepted: { label: "Aguardando entrega", icon: Hourglass, class: "bg-warning/10 text-warning" },
  delivered: { label: "Em análise", icon: Clock, class: "bg-accent/10 text-accent" },
  approved: { label: "Aprovado", icon: CheckCircle, class: "bg-primary/10 text-primary" },
  paid: { label: "Pago", icon: CircleDollarSign, class: "bg-primary/15 text-primary" },
};

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function Affiliate() {
  const { user } = useAuth();
  const { applications, balance, loading, submitDelivery, computeSplit } = useCampaignApplications();

  // input de link por candidatura + flag de envio
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);

  const campaigns = applications.filter((a) => VISIBLE.includes(a.status));

  // Ganho líquido que cai pro influencer (split 80%) de uma candidatura.
  const payout = (a: CampaignApplication) =>
    computeSplit(a.campaign?.reward_amount || 0).influencer;

  const handleSend = async (a: CampaignApplication) => {
    const url = (urls[a.id] || "").trim();
    if (!url) {
      toast.error("Cole o link do vídeo postado");
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      toast.error("Link inválido", { description: "Use o link completo (https://...)" });
      return;
    }
    setSending(a.id);
    try {
      await submitDelivery(a.id, url);
      setUrls((p) => ({ ...p, [a.id]: "" }));
      toast.success("Entrega enviada! 🎬", { description: "A marca vai revisar seu vídeo." });
    } catch {
      toast.error("Não foi possível enviar agora");
    } finally {
      setSending(null);
    }
  };

  if (loading) return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="h-28 rounded-3xl bg-muted/20 animate-pulse" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 rounded-2xl bg-muted/20 animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold tracking-tight">Meus ganhos</h1>
        <p className="text-[11px] text-muted-foreground/40">Suas campanhas e o que você já faturou</p>
      </div>

      {/* Balance Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-primary/15 via-accent/5 to-background border border-primary/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest font-semibold">Saldo disponível</p>
        <p className="text-3xl font-black mt-1 text-accent">{fmt(balance)}</p>
        <Button asChild size="sm" className="mt-4 rounded-full text-[10px] h-9 gap-1.5 w-full" disabled={balance <= 0}>
          <Link to="/wallet">
            <DollarSign className="h-3 w-3" />
            Sacar via PIX
          </Link>
        </Button>
      </div>

      {/* Resumo rápido */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Campanhas", value: campaigns.length.toString(), color: "text-foreground" },
          { label: "Aprovadas", value: campaigns.filter((a) => a.status === "approved" || a.status === "paid").length.toString(), color: "text-primary" },
          { label: "Pagas", value: campaigns.filter((a) => a.status === "paid").length.toString(), color: "text-accent" },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-2xl bg-muted/20 border border-border/15 text-center">
            <p className={cn("text-sm font-bold", s.color)}>{s.value}</p>
            <span className="text-[8px] text-muted-foreground/30 uppercase tracking-wider font-semibold">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Lista de campanhas */}
      <div>
        <h2 className="text-sm font-bold mb-3">Minhas campanhas</h2>

        {campaigns.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto">
              <Sparkles className="h-5 w-5 text-primary/40" />
            </div>
            <div>
              <p className="text-sm font-medium">Você ainda não topou nenhuma campanha</p>
              <p className="text-[11px] text-muted-foreground/30 mt-1 max-w-xs mx-auto">
                Encontre marcas perto de você e comece a faturar gravando vídeos
              </p>
            </div>
            <Button asChild size="sm" className="rounded-full text-xs gap-1.5 bg-foreground text-background hover:bg-foreground/90">
              <Link to="/mapa">
                <MapPin className="h-3.5 w-3.5" /> Ver campanhas no mapa
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {campaigns.map((a) => {
              const cfg = STATUS_CFG[a.status] ?? STATUS_CFG.accepted;
              const StatusIcon = cfg.icon;
              const reward = a.campaign?.reward_amount || 0;
              const net = payout(a);
              const isSending = sending === a.id;

              return (
                <div key={a.id} className="p-4 rounded-2xl border border-border/15 bg-background space-y-3">
                  {/* Topo: marca + status */}
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold">{a.campaign?.brand_name?.[0] ?? "?"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold leading-tight truncate">{a.campaign?.title ?? "Campanha"}</p>
                      <p className="text-[11px] text-muted-foreground/50 truncate">{a.campaign?.brand_name}</p>
                      <div className="flex items-center gap-2.5 mt-1 text-[10px] text-muted-foreground/40">
                        {a.distance_km != null && (
                          <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5 text-accent" />{a.distance_km} km</span>
                        )}
                        <span className="text-muted-foreground/30">
                          {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className={cn("text-[8px] rounded-full border-0 gap-1 px-2 py-0.5 shrink-0", cfg.class)}>
                      <StatusIcon className="h-2.5 w-2.5" />
                      {cfg.label}
                    </Badge>
                  </div>

                  {/* accepted: input pra colar link + enviar entrega */}
                  {a.status === "accepted" && (
                    <div className="space-y-2 pt-1">
                      <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1.5">
                        <TrendingUp className="h-3 w-3 text-accent" />
                        Você ganha <strong className="text-accent">{fmt(net)}</strong> ao entregar o vídeo
                      </p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Cole o link do vídeo postado"
                          className="h-9 text-xs rounded-xl border-border/20 flex-1"
                          value={urls[a.id] || ""}
                          onChange={(e) => setUrls((p) => ({ ...p, [a.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSend(a); }}
                        />
                        <Button
                          size="sm"
                          className="h-9 rounded-xl gap-1.5 bg-foreground text-background hover:bg-foreground/90 shrink-0"
                          onClick={() => handleSend(a)}
                          disabled={isSending || !(urls[a.id] || "").trim()}
                        >
                          {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          Enviar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* delivered / approved / paid: valor + status + link da entrega */}
                  {a.status !== "accepted" && (
                    <div className="flex items-center justify-between pt-1 border-t border-border/10">
                      <div className="pt-2">
                        <p className="text-[9px] text-muted-foreground/30 uppercase tracking-wider font-semibold">
                          {a.status === "paid" ? "Recebido" : "Você recebe"}
                        </p>
                        <p className={cn("text-base font-black", a.status === "paid" ? "text-accent" : "text-foreground")}>
                          {fmt(net)}
                        </p>
                        <p className="text-[9px] text-muted-foreground/30">de {fmt(reward)} por vídeo</p>
                      </div>
                      {a.delivery_url && (
                        <a
                          href={a.delivery_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-accent transition-colors pt-2"
                        >
                          <ExternalLink className="h-3 w-3" /> Ver entrega
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
