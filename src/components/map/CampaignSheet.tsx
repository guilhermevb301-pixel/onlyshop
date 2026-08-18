import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Gift, Users, BadgeDollarSign, Loader2, CheckCircle2, ArrowRight, ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCampaignApplications } from "@/hooks/useCampaignApplications";
import { useAuth } from "@/hooks/useAuth";
import { computeSplit, fmtKm } from "@/lib/campaigns";
import type { CampaignNear } from "@/lib/campaigns";

interface CampaignSheetProps {
  campaign: CampaignNear | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// Bottom-sheet de detalhe da campanha + ação de aceitar (candidatar).
export function CampaignSheet({ campaign, open, onOpenChange }: CampaignSheetProps) {
  const { apply } = useCampaignApplications();
  const { userRole } = useAuth();
  const isBrand = userRole?.role === "brand"; // marca não aceita campanha (só cria)
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  // Briefing/exigências não vêm no campaigns_near — busca ao abrir a campanha.
  const [briefing, setBriefing] = useState<string | null>(null);
  const campId = campaign?.campaign_id;
  useEffect(() => {
    if (!open || !campId) { setBriefing(null); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase.from("campaigns" as any).select("briefing").eq("id", campId).maybeSingle();
      if (alive) setBriefing((data as any)?.briefing ?? null);
    })();
    return () => { alive = false; };
  }, [open, campId]);

  if (!campaign) return null;

  const left = Math.max(0, campaign.slots - campaign.slots_filled);
  const { influencer } = computeSplit(campaign.reward_amount);
  const isPermuta = campaign.reward_type === "permuta"; // recebe o produto, sem R$

  const handleAccept = async () => {
    setLoading(true);
    try {
      const ok = await apply(campaign);
      if (ok) {
        setAccepted(true);
        toast.success("Você topou! 🎉", {
          description: "A marca vai revisar seu perfil. Assim que aprovar, você grava e envia em Meus Ganhos.",
        });
      } else {
        toast.error("Não deu pra aceitar agora", { description: "Você já pode ter topado esta campanha. Confira em Meus Ganhos." });
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

  // stagger fade-up: cada bloco entra com leve atraso (ease fluido já no .animate-slide-up).
  const step = (i: number) => ({ animationDelay: `${60 + i * 55}ms` });

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[1.75rem] border-border/40 bg-card/95 backdrop-blur-xl max-h-[88dvh] overflow-y-auto"
      >
        {/* puxador */}
        <div className="mx-auto h-1.5 w-10 rounded-full bg-white/15 mb-4" />

        <SheetHeader className="text-left animate-slide-up opacity-0" style={step(0)}>
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/10 ring-1 ring-white/[0.06] flex items-center justify-center shrink-0">
              <span className="text-base font-bold">{campaign.brand_name?.[0] ?? "?"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-semibold">
                Campanha perto de você
              </span>
              <SheetTitle className="text-base leading-tight mt-0.5">{campaign.title}</SheetTitle>
              <p className="text-xs text-muted-foreground/70 mt-0.5">{campaign.brand_name}</p>
            </div>
            <Badge className="gap-1 bg-accent text-accent-foreground border-0 text-xs shrink-0 tabular-nums">
              <BadgeDollarSign className="h-3.5 w-3.5" />{isPermuta ? "Permuta" : brl(campaign.reward_amount)}
            </Badge>
          </div>
          <SheetDescription className="sr-only">
            Detalhes da campanha {campaign.title} de {campaign.brand_name}: {brl(campaign.reward_amount)} por
            vídeo, a {fmtKm(campaign.distance_km)} de você, com {left} vaga{left !== 1 ? "s" : ""} restante
            {left !== 1 ? "s" : ""}.
          </SheetDescription>
        </SheetHeader>

        {/* destaques */}
        <div className="grid grid-cols-3 gap-2 mt-5 animate-slide-up opacity-0" style={step(1)}>
          <Info icon={<BadgeDollarSign className="h-4 w-4 text-accent" />} value={isPermuta ? "Permuta" : brl(campaign.reward_amount)} label={isPermuta ? "tipo" : "por vídeo"} />
          <Info icon={<Users className="h-4 w-4" />} value={`${left}`} label={`vaga${left !== 1 ? "s" : ""} restante${left !== 1 ? "s" : ""}`} />
          <Info icon={<MapPin className="h-4 w-4 text-accent" />} value={fmtKm(campaign.distance_km)} label="de você" />
        </div>

        {campaign.physical_item && (
          <div
            className="mt-4 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-3 flex items-center gap-2.5 animate-slide-up opacity-0"
            style={step(2)}
          >
            <div className="h-9 w-9 rounded-full bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center shrink-0">
              <Gift className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground/60 leading-none">Você recebe da marca</p>
              <p className="text-sm font-semibold truncate mt-0.5">{campaign.physical_item}</p>
            </div>
          </div>
        )}

        {/* o que o influencer recebe — valor CHEIO, sem desconto (herói cyan = dinheiro) */}
        <div
          className="mt-3 rounded-[1.25rem] bg-accent/[0.07] ring-1 ring-accent/25 p-4 text-center shadow-[inset_0_1px_0_0_hsl(174_100%_47%/0.12)] animate-slide-up opacity-0"
          style={step(3)}
        >
          <p className="text-[10px] uppercase tracking-[0.18em] text-accent/70 font-semibold">Você recebe</p>
          {isPermuta ? (
            <>
              <p className="text-xl font-black text-accent mt-1 leading-tight">{campaign.physical_item || "Produto da marca"}</p>
              <p className="text-[10px] text-muted-foreground/55 mt-1.5">permuta · o produto é seu ao entregar o vídeo</p>
            </>
          ) : (
            <>
              <p className="text-3xl font-black text-accent tabular-nums mt-1 leading-none">{brl(influencer)}</p>
              <p className="text-[10px] text-muted-foreground/55 mt-1.5">por vídeo aprovado · o valor é todo seu</p>
            </>
          )}
        </div>

        {/* Briefing / exigências da marca — o influencer vê antes de topar */}
        {briefing && (
          <div className="mt-3 rounded-[1.25rem] bg-white/[0.03] ring-1 ring-white/[0.06] p-4 animate-slide-up opacity-0" style={step(3)}>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50 font-semibold flex items-center gap-1.5">
              <ClipboardList className="h-3 w-3 text-accent" /> O que a marca pede
            </p>
            <p className="text-xs text-white/75 mt-2 whitespace-pre-line leading-relaxed">{briefing}</p>
          </div>
        )}

        {/* CTA */}
        <div className="animate-slide-up opacity-0" style={step(4)}>
          {isBrand ? (
            <div className="mt-5 rounded-2xl bg-white/[0.04] ring-1 ring-white/[0.08] py-3 px-4 text-center text-xs text-muted-foreground/70">
              Você é uma <span className="font-semibold text-foreground">marca</span> — dá pra ver quem está por perto, mas quem aceita campanha é o influencer. Crie as suas em <span className="text-primary font-semibold">Minhas campanhas</span>.
            </div>
          ) : accepted ? (
            <div className="mt-5 rounded-full bg-accent/10 ring-1 ring-accent/30 py-3 flex items-center justify-center gap-2 text-sm font-semibold text-accent">
              <CheckCircle2 className="h-4 w-4" /> Você topou esta campanha
            </div>
          ) : (
            <Button
              size="lg"
              className="group w-full mt-5 h-12 rounded-full gap-2 bg-gradient-primary border-0 font-semibold shadow-[var(--shadow-glow-cta)] transition-all duration-300 ease-[var(--ease-fluid)] active:scale-[.98]"
              disabled={loading || left === 0}
              onClick={handleAccept}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : left === 0 ? (
                "Vagas esgotadas"
              ) : (
                <>
                  Aceitar campanha
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 ease-[var(--ease-fluid)] group-hover:translate-x-0.5">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </>
              )}
            </Button>
          )}

          <p className="text-center text-[10px] text-muted-foreground/40 mt-3 pb-1">
            Sem compromisso de pagamento. Você só grava se topar.
          </p>
        </div>
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
