import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCampaignApplications } from "@/hooks/useCampaignApplications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, MapPin, Send, Loader2, CheckCircle, Clock, Hourglass,
  CircleDollarSign, ExternalLink, Sparkles, TrendingUp, ArrowRight, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { demo, demoId, type ApplicationStatus, type CampaignApplication } from "@/lib/campaigns";

// Status que entram na lista "Minhas campanhas" (filtra fora applied/rejected).
const VISIBLE: ApplicationStatus[] = ["accepted", "delivered", "approved", "paid"];

// Aparência de cada status na timeline da candidatura.
const STATUS_CFG: Record<string, { label: string; icon: typeof Clock; class: string }> = {
  accepted: { label: "Aguardando entrega", icon: Hourglass, class: "bg-warning/15 text-warning" },
  delivered: { label: "Em análise", icon: Clock, class: "bg-accent/15 text-accent" },
  approved: { label: "Aprovado", icon: CheckCircle, class: "bg-primary/15 text-primary" },
  paid: { label: "Pago", icon: CircleDollarSign, class: "bg-accent/20 text-accent" },
};

// Rótulo do valor por estado — diferencia "a receber" de "recebido".
const PAYOUT_LABEL: Record<string, string> = {
  delivered: "A receber",
  approved: "Aprovado · a creditar",
  paid: "Recebido",
};

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

// -----------------------------------------------------------------------------
// Seed demo: a tela do influencer nasce vazia (nenhuma candidatura é criada no
// onboarding). Pra não vender mal na primeira impressão, semeamos 2 candidaturas
// (1 'accepted' = fluxo de entrega aberto, 1 'paid' = ganho concretizado) só na
// sessão demo e só uma vez. Roda no load do módulo, ANTES do useEffect do hook
// fazer o primeiro refresh — então demo.apps() já vem populado.
// -----------------------------------------------------------------------------
const SEEDED_FLAG = "onlyshop_demo_affiliate_seeded";
function seedDemoApplications() {
  try {
    if (!demo.isOn()) return;
    if (localStorage.getItem(SEEDED_FLAG)) return;
    if (demo.apps().length > 0) { localStorage.setItem(SEEDED_FLAG, "1"); return; }

    const now = Date.now();
    const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

    const paid: CampaignApplication = {
      id: demoId("app"),
      campaign_id: "demo-camp-3",
      influencer_user_id: "demo",
      status: "paid",
      delivery_url: "https://www.instagram.com/reel/demo-glowlab",
      distance_km: 5.4,
      created_at: iso(1000 * 60 * 60 * 26),
      updated_at: iso(1000 * 60 * 60 * 2),
      campaign: { brand_name: "GlowLab Cosméticos", title: "Lançamento sérum facial", reward_amount: 60 },
    };
    const accepted: CampaignApplication = {
      id: demoId("app"),
      campaign_id: "demo-camp-1",
      influencer_user_id: "demo",
      status: "accepted",
      distance_km: 1.6,
      created_at: iso(1000 * 60 * 60 * 4),
      updated_at: iso(1000 * 60 * 60 * 4),
      campaign: { brand_name: "Boutique Bella", title: "Vestidos da nova coleção", reward_amount: 50 },
    };

    demo.addApp(paid);
    demo.addApp(accepted);

    // Credita o líquido da campanha paga no ledger pra o saldo nascer vivo.
    const net = 60 - 60 * 0.2; // split 80/20 → R$ 48,00
    demo.addCredit({
      id: demoId("cr"),
      user_id: "demo",
      kind: "payout",
      amount: net,
      campaign_id: "demo-camp-3",
      status: "completed",
      provider: "pix",
      provider_ref: null,
      created_at: iso(1000 * 60 * 60 * 2),
    });

    localStorage.setItem(SEEDED_FLAG, "1");
  } catch {
    /* localStorage indisponível — segue com a tela vazia (empty state caprichado). */
  }
}
seedDemoApplications();

export default function Affiliate() {
  const { user } = useAuth();
  const { applications, balance, loading, submitDelivery, computeSplit } = useCampaignApplications();
  void user;

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
      // Aviso (não bloqueia) se não parece um post de rede social — entrega de vídeo.
      if (!/(instagram|tiktok|youtu)/i.test(url)) {
        toast.info("Confira o link", { description: "Use o link do post público (Instagram, TikTok ou YouTube)." });
      }
      toast.success("Entrega enviada", { description: "A marca vai revisar seu vídeo." });
    } catch {
      toast.error("Não foi possível enviar agora");
    } finally {
      setSending(null);
    }
  };

  // ---- Loading: skeleton espelha o layout real (balance + 3 stats + cards) ----
  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="space-y-2">
          <div className="h-5 w-32 rounded-lg bg-muted/20 animate-pulse" />
          <div className="h-3 w-48 rounded bg-muted/15 animate-pulse" />
        </div>
        <div className="h-36 rounded-[1.75rem] bg-muted/20 animate-pulse" />
        <div className="grid grid-cols-3 gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-[1.25rem] bg-muted/20 animate-pulse" />
          ))}
        </div>
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-[1.5rem] bg-muted/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const approvedCount = campaigns.filter((a) => a.status === "approved" || a.status === "paid").length;
  const paidCount = campaigns.filter((a) => a.status === "paid").length;
  const canWithdraw = balance > 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <header className="animate-fade-in">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-semibold">
          Carteira do creator
        </span>
        <h1 className="text-xl font-black tracking-tight mt-0.5">Meus ganhos</h1>
        <p className="text-xs text-muted-foreground/60 mt-0.5">
          Suas campanhas e o que você já faturou
        </p>
      </header>

      {/* Balance Card — herói double-bezel, dinheiro em cyan */}
      <div
        className="rounded-[1.75rem] bg-gradient-to-b from-accent/25 via-primary/10 to-transparent p-px animate-fade-in"
        style={{ animationDelay: "60ms", animationFillMode: "both" }}
      >
        <div className="relative overflow-hidden rounded-[calc(1.75rem-1px)] bg-card/80 backdrop-blur-xl p-6 shadow-[0_24px_80px_-32px_hsl(174_100%_47%/0.35)]">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-accent/10 rounded-full blur-2xl" aria-hidden="true" />
          <div className="absolute -bottom-16 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" aria-hidden="true" />

          <div className="relative">
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em] font-semibold">
              Saldo disponível
            </span>
            <p className="text-4xl font-black mt-1.5 text-accent tabular-nums tracking-tight">
              {fmt(balance)}
            </p>

            {canWithdraw ? (
              <Button
                asChild
                className="group mt-5 w-full rounded-full h-12 gap-2 bg-gradient-primary text-white border-0 shadow-[0_8px_28px_-8px_hsl(346_100%_58%/0.5)] active:scale-[.98] transition-all ease-[cubic-bezier(.32,.72,0,1)]"
              >
                <Link to="/wallet">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                    <DollarSign className="h-3.5 w-3.5" />
                  </span>
                  Sacar via PIX
                  <ArrowRight className="h-4 w-4 ml-auto transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)] group-hover:translate-x-0.5" />
                </Link>
              </Button>
            ) : (
              <div className="mt-5 flex items-center justify-center gap-2 rounded-full h-12 border border-border/40 bg-muted/10 text-[11px] text-muted-foreground/60">
                <Lock className="h-3.5 w-3.5" />
                Complete uma entrega pra liberar o saque
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resumo rápido — número em destaque, label discreto */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: "Campanhas", value: campaigns.length, color: "text-foreground" },
          { label: "Aprovadas", value: approvedCount, color: "text-primary" },
          { label: "Pagas", value: paidCount, color: "text-accent" },
        ].map((s, i) => (
          <div
            key={s.label}
            className="rounded-[1.25rem] bg-gradient-to-b from-white/[0.06] to-transparent p-px animate-fade-in"
            style={{ animationDelay: `${120 + i * 50}ms`, animationFillMode: "both" }}
          >
            <div className="rounded-[calc(1.25rem-1px)] bg-card/60 backdrop-blur px-3 py-3.5 text-center shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.04)]">
              <p className={cn("text-xl font-black tabular-nums leading-none", s.color)}>{s.value}</p>
              <span className="mt-1.5 block text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold">
                {s.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Lista de campanhas */}
      <section>
        <h2 className="text-sm font-bold mb-3 px-0.5">Minhas campanhas</h2>

        {campaigns.length === 0 ? (
          // ---- Empty state caprichado: ícone em círculo + CTA com ícone aninhado ----
          <div className="animate-fade-in rounded-[1.75rem] border border-dashed border-border/40 bg-card/30 py-12 px-6 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <p className="mt-4 text-base font-bold">Você ainda não topou nenhuma campanha</p>
            <p className="mx-auto mt-1.5 max-w-xs text-xs text-muted-foreground/60 leading-relaxed">
              Encontre marcas perto de você, grave um vídeo e receba por entrega.
              Seu primeiro ganho aparece aqui.
            </p>
            <Button
              asChild
              className="group mt-5 rounded-full h-11 gap-2 bg-gradient-primary text-white border-0 shadow-[0_8px_28px_-8px_hsl(346_100%_58%/0.5)] active:scale-[.98] transition-all ease-[cubic-bezier(.32,.72,0,1)]"
            >
              <Link to="/mapa">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                  <MapPin className="h-3.5 w-3.5" />
                </span>
                Ver campanhas no mapa
                <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)] group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {campaigns.map((a, i) => {
              const cfg = STATUS_CFG[a.status] ?? STATUS_CFG.accepted;
              const StatusIcon = cfg.icon;
              const reward = a.campaign?.reward_amount || 0;
              const net = payout(a);
              const isSending = sending === a.id;

              return (
                <li
                  key={a.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${180 + i * 70}ms`, animationFillMode: "both" }}
                >
                  {/* double-bezel: casca gradiente + núcleo */}
                  <div className="rounded-[1.5rem] bg-gradient-to-b from-border/30 to-transparent p-px transition-all duration-300 ease-[cubic-bezier(.32,.72,0,1)] hover:from-primary/30 active:scale-[.99]">
                    <div className="rounded-[calc(1.5rem-1px)] bg-card/70 backdrop-blur p-4 space-y-3 shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.04)]">
                      {/* Topo: marca + status */}
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/15 flex items-center justify-center shrink-0 ring-1 ring-white/[0.06]">
                          <span className="text-sm font-bold">{a.campaign?.brand_name?.[0] ?? "?"}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold leading-tight truncate">{a.campaign?.title ?? "Campanha"}</p>
                          <p className="text-xs text-muted-foreground/60 truncate">{a.campaign?.brand_name}</p>
                          <div className="flex items-center gap-2.5 mt-1 text-[10px] text-muted-foreground/55">
                            {a.distance_km != null && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-2.5 w-2.5 text-accent" />{a.distance_km} km
                              </span>
                            )}
                            <span className="text-muted-foreground/45">
                              {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn("text-[10px] rounded-full border-0 gap-1 px-2.5 py-1 shrink-0 font-semibold", cfg.class)}
                        >
                          <StatusIcon className="h-2.5 w-2.5" />
                          {cfg.label}
                        </Badge>
                      </div>

                      {/* accepted: input pra colar link + enviar entrega */}
                      {a.status === "accepted" && (
                        <div className="space-y-2 pt-1">
                          <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1.5">
                            <TrendingUp className="h-3 w-3 text-accent" />
                            Você ganha <strong className="text-accent">{fmt(net)}</strong> ao entregar o vídeo
                          </p>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Cole o link do vídeo postado"
                              className="h-11 text-xs rounded-xl border-border/30 bg-background/60 flex-1"
                              value={urls[a.id] || ""}
                              onChange={(e) => setUrls((p) => ({ ...p, [a.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") handleSend(a); }}
                              aria-label="Link do vídeo postado"
                            />
                            <Button
                              className="group h-11 rounded-xl gap-1.5 bg-gradient-primary text-white border-0 shrink-0 active:scale-[.98] transition-all ease-[cubic-bezier(.32,.72,0,1)]"
                              onClick={() => handleSend(a)}
                              disabled={isSending || !(urls[a.id] || "").trim()}
                              aria-busy={isSending}
                            >
                              {isSending
                                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span className="sr-only">Enviando…</span></>
                                : <Send className="h-3.5 w-3.5 transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)] group-hover:translate-x-0.5" />}
                              Enviar
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* delivered / approved / paid: valor + status + link da entrega */}
                      {a.status !== "accepted" && (
                        <div className="flex items-center justify-between pt-3 border-t border-border/15 animate-fade-in">
                          <div>
                            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-semibold">
                              {PAYOUT_LABEL[a.status] ?? "A receber"}
                            </p>
                            <p className={cn("text-lg font-black tabular-nums leading-tight", a.status === "paid" ? "text-accent" : "text-foreground")}>
                              {fmt(net)}
                            </p>
                            <p className="text-[10px] text-muted-foreground/50">de {fmt(reward)} por vídeo</p>
                          </div>
                          {a.delivery_url && (
                            <a
                              href={a.delivery_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[11px] text-muted-foreground/55 hover:text-accent transition-colors min-h-[44px] px-2 -mr-2 rounded-lg"
                            >
                              <ExternalLink className="h-3 w-3" /> Ver entrega
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
