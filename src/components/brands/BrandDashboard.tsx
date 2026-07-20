import { useMemo, useState } from "react";
import type { Brand, Campaign } from "@/hooks/useBrand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CampaignCard } from "@/components/campaigns/CampaignCard";
import { CreateCampaignSheet } from "./CreateCampaignSheet";
import { RateInfluencerSheet } from "./RateInfluencerSheet";
import { InfluencerProfileSheet } from "./InfluencerProfileSheet";
import { useRatings } from "@/hooks/useRatings";
import { useChat } from "@/hooks/useChat";
import { useNavigate } from "react-router-dom";
import {
  Building2, CheckCircle2, Globe, MapPin, Megaphone, Wallet,
  Users, ExternalLink, CircleCheck, BadgeDollarSign, X, User, Star, MessageSquare, Trash2, UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  computeBudget, computeSplit, PLATFORM_FEE_PCT, demo, isCampaignChatOpen,
  type CampaignApplication, type CampaignNear,
} from "@/lib/campaigns";

interface Props {
  brand: Brand;
  campaigns: Campaign[];
  applications: CampaignApplication[];
  onCreateCampaign: (data: any) => Promise<Campaign | null>;
  onFunded: (campaignId: string) => Promise<void>;
  onApprove: (app: CampaignApplication, reward: number) => Promise<void>;
  onCancelCampaign?: (campaignId: string) => Promise<boolean>;
  onApproveApplicant?: (app: CampaignApplication) => Promise<boolean>;
  onRejectApplicant?: (appId: string) => Promise<boolean>;
}

// Converte a Campaign (lojista) no formato CampaignNear que o CampaignCard consome.
function toNear(c: Campaign, brand: Brand): CampaignNear {
  return {
    campaign_id: c.id,
    brand_id: c.brand_id,
    brand_name: brand.name,
    title: c.name,
    reward_amount: c.reward_amount,
    reward_type: c.reward_type,
    slots: c.slots,
    slots_filled: c.slots_filled,
    target_city: c.target_city ?? null,
    target_state: c.target_state ?? null,
    physical_item: c.physical_item ?? null,
    deadline_hours: c.deadline_hours,
    distance_km: null as any, // dashboard do dono não mostra distância
    brand_lat: brand.latitude ?? 0,
    brand_lon: brand.longitude ?? 0,
  };
}

export function BrandDashboard({ brand, campaigns, applications, onCreateCampaign, onFunded, onApprove, onCancelCampaign, onApproveApplicant, onRejectApplicant }: Props) {
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  // Overrides locais de status (reject) — useBrand não expõe reject, então refletimos aqui.
  const [overrides, setOverrides] = useState<Record<string, CampaignApplication["status"]>>({});
  // Trava de ação por candidatura (evita duplo clique → pagamento duplicado).
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  // Avaliação guiada (marca → influencer) após aprovar a entrega.
  const ratings = useRatings();
  const [rateFor, setRateFor] = useState<CampaignApplication | null>(null);
  // Perfil do influencer que aceitou (abre pelo card).
  const [profileApp, setProfileApp] = useState<CampaignApplication | null>(null);
  const fmtFollowers = (n: number) => Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  // Chat temporário com o influencer (só enquanto a campanha está ativa).
  const navigate = useNavigate();
  const { startConversation } = useChat();
  const openChat = async (a: CampaignApplication) => {
    try {
      const cid = await startConversation(a.influencer_user_id);
      if (cid) navigate(`/chat?c=${cid}`);
      else toast.error("Não foi possível abrir a conversa");
    } catch {
      toast.error("Não foi possível abrir a conversa");
    }
  };

  const statusOf = (a: CampaignApplication) => overrides[a.id] ?? a.status;

  // Candidaturas que pedem ação do lojista (entregou e espera aprovação).
  const pending = useMemo(
    () => applications.filter((a) => statusOf(a) === "delivered"),
    [applications, overrides]
  );

  const stats = useMemo(() => {
    const live = campaigns.filter((c) => c.funded).length;
    const investing = campaigns
      .filter((c) => c.funded)
      .reduce((s, c) => s + computeBudget(c.slots, c.reward_amount).total, 0);
    const approved = applications.filter((a) => statusOf(a) === "approved" || statusOf(a) === "paid").length;
    return { live, investing, approved };
  }, [campaigns, applications, overrides]);

  const rewardFor = (campaignId: string) =>
    campaigns.find((c) => c.id === campaignId)?.reward_amount ??
    (applications.find((a) => a.campaign_id === campaignId)?.campaign?.reward_amount ?? 0);

  const handleApprove = async (app: CampaignApplication) => {
    const s = statusOf(app);
    if (busy[app.id] || s === "approved" || s === "paid") return; // idempotência
    setBusy((b) => ({ ...b, [app.id]: true }));
    try {
      const reward = rewardFor(app.campaign_id);
      const split = computeSplit(reward);
      await onApprove(app, reward);
      toast.success("Entrega aprovada!", {
        description: `${fmt(split.influencer)} liberados pro influencer · taxa ${fmt(split.platform)}.`,
      });
    } finally {
      setBusy((b) => ({ ...b, [app.id]: false }));
    }
  };

  const handleReject = async (app: CampaignApplication) => {
    if (busy[app.id] || statusOf(app) !== "delivered") return;
    setBusy((b) => ({ ...b, [app.id]: true }));
    try {
      if (demo.isOn()) demo.updateApp(app.id, { status: "rejected" });
      setOverrides((o) => ({ ...o, [app.id]: "rejected" }));
      toast("Entrega recusada", {
        description: "O influencer pode reenviar o vídeo corrigido.",
      });
    } finally {
      setBusy((b) => ({ ...b, [app.id]: false }));
    }
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header da marca */}
      <div className="flex items-center gap-4 animate-fade-in">
        <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center shrink-0 overflow-hidden shadow-[var(--shadow-glow-cta)]">
          {brand.logo_url ? (
            <img src={brand.logo_url} alt={brand.name} className="h-full w-full rounded-2xl object-cover" />
          ) : (
            <Building2 className="h-8 w-8 text-primary-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-display font-bold truncate">{brand.name}</h1>
            {brand.verified && <CheckCircle2 className="h-5 w-5 text-success shrink-0" />}
          </div>
          {brand.city && (
            <p className="text-xs text-muted-foreground/60 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-accent" /> {brand.city}{brand.state ? `, ${brand.state}` : ""}
            </p>
          )}
          {brand.website && (
            <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground/60 flex items-center gap-1 hover:text-primary transition-colors">
              <Globe className="h-3 w-3" /> {brand.website.replace(/https?:\/\//, "")}
            </a>
          )}
        </div>
      </div>

      {/* Stats — double-bezel + fade-up stagger */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { icon: Megaphone, label: "Campanhas no ar", value: String(stats.live), color: "text-primary", glow: "from-primary/12" },
          { icon: BadgeDollarSign, label: "Investido", value: fmt(stats.investing), color: "text-accent", glow: "from-accent/14", money: true },
          { icon: CircleCheck, label: "Entregas aprovadas", value: String(stats.approved), color: "text-success", glow: "from-success/12" },
        ].map((s, i) => (
          <div
            key={s.label}
            className={cn("rounded-[1.5rem] bg-gradient-to-b p-px animate-fade-in", s.glow, "to-transparent")}
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="rounded-[calc(1.5rem-1px)] bg-card/60 backdrop-blur p-3 text-center ring-1 ring-white/[0.05] shadow-[var(--shadow-bezel-inset)]">
              <span className={cn("mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full", s.color, "bg-current/10")}>
                <s.icon className={cn("h-4 w-4", s.color)} />
              </span>
              <p className={cn("text-base font-black leading-none tabular-nums truncate", s.money && "text-accent")}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground/50 mt-1.5 uppercase tracking-wider leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList className="grid w-full grid-cols-2 rounded-full">
          <TabsTrigger value="campaigns" className="rounded-full text-xs gap-1.5">
            <Megaphone className="h-3 w-3" /> Campanhas ({campaigns.length})
          </TabsTrigger>
          <TabsTrigger value="applications" className="rounded-full text-xs gap-1.5">
            <Users className="h-3 w-3" /> Candidaturas{pending.length > 0 ? ` (${pending.length})` : ""}
          </TabsTrigger>
        </TabsList>

        {/* CAMPANHAS */}
        <TabsContent value="campaigns" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <CreateCampaignSheet onCreate={onCreateCampaign} onFunded={onFunded} />
          </div>

          {campaigns.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-border/40 bg-muted/[0.04] py-12 px-6 text-center animate-fade-in">
              <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20 shadow-[var(--shadow-glow-cta)]">
                <Megaphone className="h-7 w-7 text-primary" />
              </span>
              <p className="font-bold text-base">Sua primeira campanha começa aqui</p>
              <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs mx-auto">
                Crie um gig e influencers locais gravam vídeos do seu produto. Você só paga por entrega aprovada.
              </p>
              <div className="mt-5 flex justify-center">
                <CreateCampaignSheet onCreate={onCreateCampaign} onFunded={onFunded} triggerLabel="Criar primeira campanha" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c, i) => (
                <div key={c.id} className="space-y-2 animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                  {/* Status renderizado ACIMA do card — nunca sobre o badge de R$ */}
                  <div className="flex items-center justify-between px-1">
                    {c.funded ? (
                      <Badge className="bg-success/15 text-success border-0 gap-1 text-[10px]">
                        <CircleCheck className="h-3 w-3" /> No ar
                      </Badge>
                    ) : (
                      <Badge className="bg-warning/15 text-warning border-0 gap-1 text-[10px]">
                        <Wallet className="h-3 w-3" /> Aguardando pagamento
                      </Badge>
                    )}
                    <div className="flex items-center gap-2">
                      {!c.funded && (
                        <ResumePaymentButton campaign={c} onFunded={onFunded} />
                      )}
                      {onCancelCampaign && (
                        <button
                          type="button"
                          aria-label="Excluir campanha"
                          onClick={() => {
                            const msg = c.funded
                              ? `Excluir "${c.name}"? Ela sai do ar (não mexe em pagamentos já feitos).`
                              : `Excluir "${c.name}"? Ela ainda não foi paga.`;
                            if (window.confirm(msg)) {
                              onCancelCampaign(c.id).then((ok) => {
                                if (ok) toast.success("Campanha excluída");
                                else toast.error("Não foi possível excluir agora");
                              });
                            }
                          }}
                          className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 active:scale-90"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <CampaignCard c={toNear(c, brand)} />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CANDIDATURAS */}
        <TabsContent value="applications" className="mt-4 space-y-3">
          {/* Curadoria: quem sinalizou interesse e aguarda o SEU OK (pedido do Biel).
              Só vira contratação — e só paga — depois que você aprova o perfil. */}
          {onApproveApplicant && applications.some((a) => statusOf(a) === "applied") && (
            <div className="rounded-[1.5rem] bg-gradient-to-b from-warning/[0.1] to-transparent p-px animate-slide-up">
              <div className="rounded-[calc(1.5rem-1px)] bg-card/80 ring-1 ring-inset ring-warning/10 p-4 space-y-2.5">
                <div>
                  <p className="text-sm font-bold flex items-center gap-1.5"><UserCheck className="h-4 w-4 text-warning" /> Aguardando seu OK</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">Veja quem quer trabalhar com você. Só vira contratação (e pagamento) depois que você aprova.</p>
                </div>
                {applications.filter((a) => statusOf(a) === "applied").map((a) => (
                  <div key={a.id} className="flex items-center gap-2 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-3">
                    <button type="button" onClick={() => setProfileApp(a)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left active:scale-[.99] transition-transform">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/30 to-accent/10 ring-1 ring-white/[0.06] grid place-items-center shrink-0 overflow-hidden">
                        {a.influencer?.avatar_url
                          ? <img src={a.influencer.avatar_url} alt="" className="h-full w-full object-cover" />
                          : <span className="text-xs font-bold">{(a.influencer?.display_name || a.influencer?.username || "?")[0]?.toUpperCase()}</span>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{a.influencer?.display_name || a.influencer?.username || "Candidato"}</p>
                        <p className="text-[10px] text-muted-foreground/55 truncate">{campaigns.find((c) => c.id === a.campaign_id)?.name ?? "Campanha"} · toque pra ver o perfil</p>
                      </div>
                    </button>
                    <Button
                      size="sm"
                      onClick={async () => { const ok = await onApproveApplicant(a); ok ? toast.success("Contratado!", { description: "O afiliado já pode trabalhar." }) : toast.error("Não foi possível aprovar"); }}
                      className="h-8 rounded-full px-3 text-xs bg-gradient-primary border-0 shrink-0"
                    >
                      Aprovar
                    </Button>
                    {onRejectApplicant && (
                      <button type="button" aria-label="Recusar candidato" onClick={async () => { const ok = await onRejectApplicant(a.id); if (ok) toast.success("Candidato recusado"); }} className="text-muted-foreground/40 hover:text-destructive p-1 shrink-0">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {applications.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-border/40 bg-muted/[0.04] py-12 px-6 text-center animate-fade-in">
              <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20 shadow-[var(--shadow-glow-cta)]">
                <Users className="h-7 w-7 text-primary" />
              </span>
              <p className="font-bold text-base">Nenhuma candidatura ainda</p>
              <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs mx-auto">
                Suas campanhas atraem influencers locais — eles aparecem aqui assim que aceitarem a vaga.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {applications.map((a, i) => {
                const status = statusOf(a);
                const reward = rewardFor(a.campaign_id);
                const split = computeSplit(reward);
                const isPermuta = campaigns.find((c) => c.id === a.campaign_id)?.reward_type === "permuta";
                const proofLinks = a.proofs?.links?.length ? a.proofs.links : (a.delivery_url ? [a.delivery_url] : []);
                const isDelivered = status === "delivered";
                const isApproved = status === "approved" || status === "paid";
                const isRejected = status === "rejected";
                const acting = !!busy[a.id];
                return (
                  <div
                    key={a.id}
                    className="rounded-[1.5rem] bg-gradient-to-b from-border/25 to-transparent p-px animate-slide-up"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="rounded-[calc(1.5rem-1px)] bg-card/80 backdrop-blur p-3.5 ring-1 ring-white/[0.04] shadow-[var(--shadow-bezel-inset)]">
                      <div className="flex items-center gap-3">
                        {/* Header clicável → abre o perfil de quem aceitou */}
                        <div
                          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer rounded-xl -m-1 p-1 hover:bg-white/[0.03] transition-colors"
                          role="button" tabIndex={0}
                          onClick={() => setProfileApp(a)}
                          onKeyDown={(e) => { if (e.key === "Enter") setProfileApp(a); }}
                        >
                          <Avatar className="h-10 w-10 ring-1 ring-white/[0.06] shrink-0">
                            {a.influencer?.avatar_url ? <AvatarImage src={a.influencer.avatar_url} alt="" /> : null}
                            <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/10 text-muted-foreground">
                              {a.influencer?.display_name ? a.influencer.display_name[0]?.toUpperCase() : <User className="h-4 w-4" />}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{a.influencer?.display_name || a.influencer?.username || "Influencer"}</p>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
                              <StatusBadge status={status} />
                              {a.influencer?.followers_count != null && (
                                <span className="flex items-center gap-0.5"><Users className="h-2.5 w-2.5" />{fmtFollowers(a.influencer.followers_count)}</span>
                              )}
                              {a.distance_km != null && (
                                <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{a.distance_km} km</span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground/40 truncate">{a.campaign?.title || "Campanha"}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-accent tabular-nums">{isPermuta ? "Permuta" : fmt(reward)}</p>
                          <p className="text-[10px] text-muted-foreground/40">{isPermuta ? "produto" : "por vídeo"}</p>
                        </div>
                      </div>

                      {/* Chat temporário — só enquanto a campanha está ativa (accepted/delivered) */}
                      {isCampaignChatOpen(status) && (
                        <button
                          type="button"
                          onClick={() => openChat(a)}
                          className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary bg-primary/10 ring-1 ring-primary/20 rounded-full px-3 py-1.5 hover:bg-primary/15 transition-colors active:scale-[.98]"
                        >
                          <MessageSquare className="h-3 w-3" /> Conversar
                        </button>
                      )}

                      {/* Comprovações da entrega (um ou mais links) + comentário do influencer */}
                      {proofLinks.length > 0 && (
                        <div className="mt-2.5 space-y-1.5">
                          {proofLinks.map((l, idx) => (
                            <a
                              key={idx}
                              href={l} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-[11px] text-primary hover:underline truncate min-h-[32px] py-0.5"
                            >
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              <span className="truncate">{proofLinks.length > 1 ? `Comprovação ${idx + 1} — ` : ""}{l}</span>
                            </a>
                          ))}
                        </div>
                      )}
                      {a.proofs?.comment && (
                        <p className="mt-1.5 text-[11px] text-muted-foreground/70 italic leading-relaxed rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                          "{a.proofs.comment}"
                        </p>
                      )}

                      {isDelivered && (
                        <div className="mt-3 space-y-2">
                          <p className="text-[10px] text-muted-foreground/50">
                            {isPermuta
                              ? "Aprovar confirma a permuta (o influencer já recebeu o produto)."
                              : `Aprovar libera ${fmt(split.influencer)} pro influencer (taxa ${PLATFORM_FEE_PCT}%).`}
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              className="rounded-full h-10 px-4 text-xs gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive active:scale-[.98] transition-transform"
                              onClick={() => handleReject(a)}
                              disabled={acting}
                            >
                              <X className="h-3.5 w-3.5" /> Recusar
                            </Button>
                            <Button
                              className="group flex-1 rounded-full bg-gradient-primary border-0 text-primary-foreground h-10 text-xs gap-1.5 active:scale-[.98] transition-transform shadow-[var(--shadow-glow-cta)] disabled:opacity-70 disabled:active:scale-100"
                              onClick={() => handleApprove(a)}
                              disabled={acting}
                              aria-busy={acting}
                            >
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15">
                                <CircleCheck className="h-3 w-3" />
                              </span>
                              Aprovar entrega
                            </Button>
                          </div>
                        </div>
                      )}

                      {isApproved && (
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <p className="text-[11px] text-success flex items-center gap-1.5 min-w-0">
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success/15 shrink-0">
                              <CircleCheck className="h-3 w-3" />
                            </span>
                            <span className="truncate">{isPermuta ? "Entrega aprovada" : `Pago · ${fmt(split.influencer)}`}</span>
                          </p>
                          {(() => {
                            const r = ratings.myRatingFor(a.id);
                            return r ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning bg-warning/10 ring-1 ring-warning/20 rounded-full px-2.5 py-1 shrink-0">
                                <Star className="h-3 w-3 fill-warning" /> {r.stars} · Avaliado
                              </span>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => setRateFor(a)} className="rounded-full h-8 gap-1.5 text-[11px] border-border/40 shrink-0">
                                <Star className="h-3 w-3" /> Avaliar
                              </Button>
                            );
                          })()}
                        </div>
                      )}

                      {isRejected && (
                        <p className="mt-2.5 text-[11px] text-destructive flex items-center gap-1.5">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-destructive/15">
                            <X className="h-3 w-3" />
                          </span>
                          Entrega recusada
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Avaliação guiada da marca → influencer (após aprovar) */}
      {rateFor && (
        <RateInfluencerSheet
          open={!!rateFor}
          onOpenChange={(o) => { if (!o) setRateFor(null); }}
          applicationId={rateFor.id}
          ratedUserId={rateFor.influencer_user_id}
          influencerName={(rateFor as any).influencer?.display_name || undefined}
          onDone={() => ratings.refresh()}
        />
      )}

      {/* Perfil do influencer que aceitou (read-only) */}
      {profileApp && (
        <InfluencerProfileSheet
          application={profileApp}
          open={!!profileApp}
          onOpenChange={(o) => { if (!o) setProfileApp(null); }}
        />
      )}
    </div>
  );
}

// Reabre o passo de pagamento de uma campanha criada mas ainda não paga (fluxo interrompido).
function ResumePaymentButton({ campaign, onFunded }: { campaign: Campaign; onFunded: (id: string) => Promise<void> }) {
  return (
    <CreateCampaignSheet
      onCreate={async () => null}
      onFunded={onFunded}
      resumeCampaign={campaign}
      triggerLabel="Pagar agora"
      triggerVariant="link"
    />
  );
}

function StatusBadge({ status }: { status: CampaignApplication["status"] }) {
  const map: Record<CampaignApplication["status"], { label: string; cls: string }> = {
    applied: { label: "Candidatou", cls: "bg-muted/40 text-muted-foreground" },
    accepted: { label: "Aceitou", cls: "bg-accent/10 text-accent" },
    delivered: { label: "Entregou", cls: "bg-warning/10 text-warning" },
    approved: { label: "Aprovado", cls: "bg-success/10 text-success" },
    paid: { label: "Pago", cls: "bg-success/10 text-success" },
    rejected: { label: "Recusado", cls: "bg-destructive/10 text-destructive" },
  };
  const cfg = map[status];
  return <Badge variant="secondary" className={cn("text-[9px] rounded-full border-0 px-1.5 py-0", cfg.cls)}>{cfg.label}</Badge>;
}
