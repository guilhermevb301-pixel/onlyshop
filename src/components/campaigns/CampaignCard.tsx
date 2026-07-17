import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Gift, Users, BadgeDollarSign, ArrowRight } from "lucide-react";
import { fmtKm } from "@/lib/campaigns";
import type { CampaignNear } from "@/lib/campaigns";

interface CampaignCardProps {
  c: CampaignNear;
  onClick?: () => void;
  ctaLabel?: string;
  onCta?: () => void;
  ctaDisabled?: boolean;
  compact?: boolean;
}

// Card de campanha reaproveitado: mapa (lista), ganhos do influencer, dashboard do lojista.
export function CampaignCard({ c, onClick, ctaLabel, onCta, ctaDisabled, compact }: CampaignCardProps) {
  const left = Math.max(0, c.slots - c.slots_filled);
  return (
    <Card
      className="border-border/30 overflow-hidden hover:border-border/60 transition-colors"
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <CardContent className={compact ? "p-3" : "p-4"}>
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold">{c.brand_name?.[0] ?? "?"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight truncate">{c.title}</p>
            <p className="text-[11px] text-muted-foreground/70 truncate">{c.brand_name}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground/70">
              {c.distance_km != null && (
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-accent" />{fmtKm(c.distance_km)}</span>
              )}
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{left} vaga{left !== 1 ? "s" : ""}</span>
              {c.physical_item && (
                <span className="flex items-center gap-1 truncate"><Gift className="h-3 w-3" />{c.physical_item}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge className="gap-1 bg-accent text-accent-foreground border-0 text-[11px]">
              <BadgeDollarSign className="h-3 w-3" />{c.reward_type === "permuta" ? "Permuta" : `R$ ${c.reward_amount}`}
            </Badge>
            <span className="text-[9px] text-muted-foreground/50">{c.reward_type === "permuta" ? "produto" : "por vídeo"}</span>
          </div>
        </div>

        {ctaLabel && (
          <Button
            size="sm"
            className="w-full mt-3 rounded-full gap-1 bg-gradient-primary border-0"
            disabled={ctaDisabled}
            onClick={(e) => { e.stopPropagation(); onCta?.(); }}
          >
            {ctaLabel} {!ctaDisabled && <ArrowRight className="h-3.5 w-3.5" />}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
