import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Gift, Users, BadgeDollarSign, Loader2, CheckCircle2, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useCampaignApplications } from "@/hooks/useCampaignApplications";
import { computeSplit } from "@/lib/campaigns";
import type { CampaignNear } from "@/lib/campaigns";

interface CampaignSheetProps {
  campaign: CampaignNear | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Bottom-sheet de detalhe da campanha + ação de aceitar (candidatar).
export function CampaignSheet({ campaign, open, onOpenChange }: CampaignSheetProps) {
  const { apply } = useCampaignApplications();
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  if (!campaign) return null;

  const left = Math.max(0, campaign.slots - campaign.slots_filled);
  const { influencer } = computeSplit(campaign.reward_amount);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const ok = await apply(campaign);
      if (ok) {
        setAccepted(true);
        toast.success("Você topou! 🎉", {
          description: "Grave e poste, depois envie o link em Meus Ganhos.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Reseta o estado de "aceito" ao fechar pra próxima campanha abrir limpa.
  const handleOpenChange = (v: boolean) => {
    if (!v) setAccepted(false);
    onOpenChange(v);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-border/40 bg-card/95 backdrop-blur-xl max-h-[88dvh] overflow-y-auto"
      >
        {/* puxador */}
        <div className="mx-auto h-1.5 w-10 rounded-full bg-white/15 mb-4" />

        <SheetHeader className="text-left">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/10 flex items-center justify-center shrink-0">
              <span className="text-base font-bold">{campaign.brand_name?.[0] ?? "?"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base leading-tight">{campaign.title}</SheetTitle>
              <p className="text-xs text-muted-foreground/70 mt-0.5">{campaign.brand_name}</p>
            </div>
            <Badge className="gap-1 bg-accent text-accent-foreground border-0 text-xs shrink-0">
              <BadgeDollarSign className="h-3.5 w-3.5" />R$ {campaign.reward_amount}
            </Badge>
          </div>
        </SheetHeader>

        {/* destaques */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          <Info icon={<BadgeDollarSign className="h-4 w-4 text-accent" />} value={`R$ ${campaign.reward_amount}`} label="por vídeo" />
          <Info icon={<Users className="h-4 w-4" />} value={`${left}`} label={`vaga${left !== 1 ? "s" : ""} restante${left !== 1 ? "s" : ""}`} />
          <Info icon={<MapPin className="h-4 w-4 text-accent" />} value={`${campaign.distance_km} km`} label="de você" />
        </div>

        {campaign.physical_item && (
          <div className="mt-4 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-3 flex items-center gap-2.5">
            <Gift className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground/60 leading-none">Você recebe da marca</p>
              <p className="text-sm font-semibold truncate mt-0.5">{campaign.physical_item}</p>
            </div>
          </div>
        )}

        {/* quanto entra no bolso (split 80/20) */}
        <div className="mt-3 rounded-2xl bg-accent/5 ring-1 ring-accent/20 p-3 text-center">
          <p className="text-[10px] text-muted-foreground/60">Você recebe por vídeo aprovado</p>
          <p className="text-lg font-extrabold text-accent tabular-nums mt-0.5">R$ {influencer.toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground/50">já com a taxa da plataforma descontada</p>
        </div>

        {/* CTA */}
        {accepted ? (
          <div className="mt-5 rounded-full bg-accent/10 ring-1 ring-accent/30 py-3 flex items-center justify-center gap-2 text-sm font-semibold text-accent">
            <CheckCircle2 className="h-4 w-4" /> Você topou esta campanha
          </div>
        ) : (
          <Button
            size="lg"
            className="w-full mt-5 rounded-full gap-1.5 bg-gradient-primary border-0 font-semibold"
            disabled={loading || left === 0}
            onClick={handleAccept}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : left === 0 ? (
              "Vagas esgotadas"
            ) : (
              <>Aceitar campanha <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        )}

        <p className="text-center text-[10px] text-muted-foreground/40 mt-3 pb-1">
          Sem compromisso de pagamento — você só grava se topar.
        </p>
      </SheetContent>
    </Sheet>
  );
}

function Info({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] px-2 py-3 text-center">
      <div className="flex items-center justify-center gap-1">
        {icon}
        <span className="text-sm font-bold tabular-nums">{value}</span>
      </div>
      <p className="text-[10px] text-muted-foreground/60 mt-1 leading-tight">{label}</p>
    </div>
  );
}
