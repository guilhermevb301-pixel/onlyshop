import { MapPin, MessageCircle, Coins } from "lucide-react";

const STEPS = [
  { icon: MapPin, t: "Indique", d: "Uma empresa ou loja da sua rua/região" },
  { icon: MessageCircle, t: "Explique", d: "Como o OnlyShop organiza os afiliados dela e faz vender mais" },
  { icon: Coins, t: "Ganhe", d: "Sempre que ela investir — pra sempre" },
];

// Os 3 passos da indicação. variant="compact" pra usar no media-kit.
export function ReferralSteps({ variant }: { variant?: "compact" }) {
  if (variant === "compact") {
    return (
      <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
        Indica empresas da sua região e ganha <b className="text-accent">33% + 5% recorrente</b> de cada uma, pra sempre.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={i} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-3">
            <div className="h-8 w-8 rounded-xl bg-primary/10 ring-1 ring-primary/20 grid place-items-center shrink-0">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{i + 1}. {s.t}</p>
              <p className="text-[11px] text-muted-foreground/60">{s.d}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
