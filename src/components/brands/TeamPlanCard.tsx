import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PLANS, planByTier, recommendedPlan, planPriceLabel, type Plan } from "@/lib/plans";
import { HelpTip } from "@/components/ui/help-tip";
import { Crown, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

// Plano de gestão da marca (modelo CRM SaaS). Mostra o uso atual vs o teto do
// plano e deixa ativar um TRIAL. A cobrança recorrente real (MP) NÃO roda aqui —
// ativar só registra a intenção; ninguém é cobrado até ligarmos o pagamento.
export function TeamPlanCard({ brandId, planTier, planStatus, affiliateCount, onChange }: {
  brandId: string; planTier: string; planStatus: string; affiliateCount: number; onChange?: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const current = planByTier(planTier);
  const rec = recommendedPlan(affiliateCount);
  const active = planStatus === "active" || planStatus === "trial";

  const choose = async (p: Plan) => {
    if (p.priceMonth < 0) { toast.info("Enterprise", { description: "Base grande? Vamos montar um plano sob medida — fale com a gente." }); return; }
    setBusy(p.tier);
    try {
      const { error } = await supabase
        .from("brands")
        .update({ plan_tier: p.tier, plan_status: "trial", plan_selected_at: new Date().toISOString() } as any)
        .eq("id", brandId);
      if (error) throw error;
      toast.success(`Plano ${p.name} ativado`, { description: "Teste liberado. A cobrança só entra quando você confirmar o pagamento." });
      setOpen(false);
      onChange?.();
    } catch {
      toast.error("Não foi possível ativar o plano");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-[1.25rem] bg-gradient-to-b from-accent/[0.08] to-transparent p-px">
      <div className="rounded-[calc(1.25rem-1px)] bg-card/80 ring-1 ring-inset ring-accent/10 p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5 text-accent" /> Plano de gestão
            <HelpTip title="Plano de gestão" body="Use o OnlyShop como o CRM da sua base de afiliados. A mensalidade acompanha o tamanho do time que você gerencia. Ativar libera o teste — a cobrança só começa quando o pagamento for confirmado." className="h-4 w-4" iconClassName="h-3 w-3" />
          </p>
          {active && current && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/12 text-emerald-400 ring-1 ring-emerald-500/25">
              {planStatus === "trial" ? "Em teste" : "Ativo"}
            </span>
          )}
        </div>

        {/* uso vs teto */}
        <div className="mt-3">
          <div className="flex items-end justify-between">
            <p className="text-2xl font-black tabular-nums">{affiliateCount}<span className="text-sm font-semibold text-muted-foreground/50"> afiliados</span></p>
            <p className="text-xs text-muted-foreground/60">
              {active && current ? `Plano ${current.name}` : `Sugerido: ${rec.name}`}
            </p>
          </div>
          {(() => {
            const teto = (active && current ? current : rec).maxAffiliates;
            const pct = teto === Infinity ? 8 : Math.min(100, Math.round((affiliateCount / teto) * 100));
            return (
              <div className="mt-2 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${Math.max(6, pct)}%` }} />
              </div>
            );
          })()}
          <p className="text-[10px] text-muted-foreground/40 mt-1">
            {(() => { const teto = (active && current ? current : rec).maxAffiliates; return teto === Infinity ? "base ilimitada" : `de até ${teto} no plano`; })()}
          </p>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-3 w-full h-10 rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08] text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[.98] transition-transform"
        >
          <Sparkles className="h-4 w-4 text-accent" /> {active ? "Trocar de plano" : "Ver planos e ativar"}
        </button>

        {open && (
          <div className="mt-3 space-y-2">
            {PLANS.map((p) => {
              const isCur = active && p.tier === planTier;
              const isRec = !active && p.tier === rec.tier;
              return (
                <button
                  key={p.tier}
                  onClick={() => choose(p)}
                  disabled={busy !== null || isCur}
                  className={`w-full flex items-center gap-3 rounded-xl p-3 ring-1 transition-colors text-left ${isCur ? "bg-emerald-500/[0.08] ring-emerald-500/25" : p.highlight ? "bg-accent/[0.06] ring-accent/20" : "bg-white/[0.03] ring-white/[0.06]"}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold">{p.name}</p>
                      {isRec && <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-accent/15 text-accent">recomendado</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground/55">{p.maxAffiliates === Infinity ? "afiliados ilimitados" : `até ${p.maxAffiliates} afiliados`}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black">{planPriceLabel(p)}</p>
                  </div>
                  {busy === p.tier ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : isCur ? <Check className="h-4 w-4 text-emerald-400 shrink-0" /> : null}
                </button>
              );
            })}
            <p className="text-[10px] text-muted-foreground/40 text-center leading-relaxed pt-1">
              Valores sugeridos. Ativar libera o teste — ninguém é cobrado até o pagamento ser ligado.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
