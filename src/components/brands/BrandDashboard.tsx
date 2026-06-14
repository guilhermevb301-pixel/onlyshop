import { useMemo } from "react";
import type { Brand, Campaign } from "@/hooks/useBrand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CampaignCard } from "@/components/campaigns/CampaignCard";
import { CreateCampaignSheet } from "./CreateCampaignSheet";
import {
  Building2, CheckCircle2, Globe, MapPin, Megaphone, Wallet,
  Users, ExternalLink, CircleCheck, BadgeDollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  computeBudget, computeSplit, PLATFORM_FEE_PCT,
  type CampaignApplication, type CampaignNear,
} from "@/lib/campaigns";

interface Props {
  brand: Brand;
  campaigns: Campaign[];
  applications: CampaignApplication[];
  onCreateCampaign: (data: any) => Promise<Campaign | null>;
  onFunded: (campaignId: string) => Promise<void>;
  onApprove: (app: CampaignApplication, reward: number) => Promise<void>;
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

export function BrandDashboard({ brand, campaigns, applications, onCreateCampaign, onFunded, onApprove }: Props) {
  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  // Candidaturas que pedem ação do lojista (entregou e espera aprovação).
  const pending = useMemo(
    () => applications.filter((a) => a.status === "delivered"),
    [applications]
  );

  const stats = useMemo(() => {
    const live = campaigns.filter((c) => c.funded).length;
    const investing = campaigns
      .filter((c) => c.funded)
      .reduce((s, c) => s + computeBudget(c.slots, c.reward_amount).total, 0);
    const approved = applications.filter((a) => a.status === "approved" || a.status === "paid").length;
    return { live, investing, approved };
  }, [campaigns, applications]);

  const rewardFor = (campaignId: string) =>
    campaigns.find((c) => c.id === campaignId)?.reward_amount ??
    (applications.find((a) => a.campaign_id === campaignId)?.campaign?.reward_amount ?? 0);

  const handleApprove = async (app: CampaignApplication) => {
    const reward = rewardFor(app.campaign_id);
    const split = computeSplit(reward);
    await onApprove(app, reward);
    toast.success("Entrega aprovada!", {
      description: `${fmt(split.influencer)} liberados pro influencer · taxa ${fmt(split.platform)}.`,
    });
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header da marca */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center shrink-0 overflow-hidden">
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
            <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-accent" /> {brand.city}{brand.state ? `, ${brand.state}` : ""}
            </p>
          )}
          {brand.website && (
            <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-[11px] text-muted-foreground/60 flex items-center gap-1 hover:text-primary transition-colors">
              <Globe className="h-3 w-3" /> {brand.website.replace(/https?:\/\//, "")}
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Megaphone, label: "Campanhas no ar", value: stats.live, color: "text-primary" },
          { icon: BadgeDollarSign, label: "Investido", value: fmt(stats.investing), color: "text-accent" },
          { icon: CircleCheck, label: "Entregas aprovadas", value: stats.approved, color: "text-success" },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-2xl bg-muted/20 border border-border/15 text-center">
            <s.icon className={cn("h-4 w-4 mx-auto mb-1", s.color)} />
            <p className="text-base font-bold leading-none">{s.value}</p>
            <p className="text-[9px] text-muted-foreground/40 mt-1 uppercase tracking-wide">{s.label}</p>
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
            <div className="text-center py-14 text-muted-foreground/50">
              <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-sm">Nenhuma campanha ainda</p>
              <p className="text-xs">Crie uma e influencers locais vão gravar vídeos do seu produto.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <div key={c.id} className="relative">
                  <CampaignCard c={toNear(c, brand)} />
                  <div className="absolute top-3 right-3">
                    {c.funded ? (
                      <Badge className="bg-success/15 text-success border-0 gap-1 text-[10px]">
                        <CircleCheck className="h-3 w-3" /> No ar
                      </Badge>
                    ) : (
                      <Badge className="bg-warning/15 text-warning border-0 gap-1 text-[10px]">
                        <Wallet className="h-3 w-3" /> Aguardando pagamento
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CANDIDATURAS */}
        <TabsContent value="applications" className="mt-4 space-y-3">
          {applications.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground/50">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-sm">Nenhuma candidatura ainda</p>
              <p className="text-xs">Assim que um influencer aceitar sua campanha, ele aparece aqui.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {applications.map((a) => {
                const reward = rewardFor(a.campaign_id);
                const split = computeSplit(reward);
                const isDelivered = a.status === "delivered";
                const isApproved = a.status === "approved" || a.status === "paid";
                return (
                  <Card key={a.id} className="border-border/30">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={undefined} />
                          <AvatarFallback className="text-[11px]">{(a.campaign?.title || "?")[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{a.campaign?.title || "Campanha"}</p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
                            <StatusBadge status={a.status} />
                            {a.distance_km != null && (
                              <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{a.distance_km} km</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-accent">{fmt(reward)}</p>
                          <p className="text-[9px] text-muted-foreground/40">por vídeo</p>
                        </div>
                      </div>

                      {a.delivery_url && (
                        <a
                          href={a.delivery_url} target="_blank" rel="noopener noreferrer"
                          className="mt-2.5 flex items-center gap-1.5 text-[11px] text-primary hover:underline truncate"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" /> {a.delivery_url}
                        </a>
                      )}

                      {isDelivered && (
                        <div className="mt-3 flex items-center gap-2">
                          <p className="text-[10px] text-muted-foreground/50 flex-1">
                            Aprovar libera {fmt(split.influencer)} pro influencer (taxa {PLATFORM_FEE_PCT}%).
                          </p>
                          <Button
                            size="sm"
                            className="rounded-full bg-gradient-primary border-0 text-primary-foreground h-8 text-[11px] gap-1"
                            onClick={() => handleApprove(a)}
                          >
                            <CircleCheck className="h-3.5 w-3.5" /> Aprovar entrega
                          </Button>
                        </div>
                      )}

                      {isApproved && (
                        <p className="mt-2 text-[11px] text-success flex items-center gap-1">
                          <CircleCheck className="h-3 w-3" /> Pago: {fmt(split.influencer)} pro influencer
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
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
