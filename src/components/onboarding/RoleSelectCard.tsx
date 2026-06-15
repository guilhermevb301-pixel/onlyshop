import { Building2, Users, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingRole } from "@/lib/onboarding";

interface RoleSelectCardProps {
  onSelect: (role: OnboardingRole) => void;
  selected?: OnboardingRole | null;
}

// Passo 1 do onboarding: dois cards grandes pra escolher o papel.
// brand = loja/marca · affiliate = influencer/creator.
const OPTIONS: {
  role: OnboardingRole;
  icon: typeof Building2;
  title: string;
  desc: string;
  accent: "primary" | "accent";
}[] = [
  {
    role: "brand",
    icon: Building2,
    title: "Sou loja / marca",
    desc: "Quero influencers da minha região divulgando meus produtos.",
    accent: "primary",
  },
  {
    role: "affiliate",
    icon: Users,
    title: "Sou influencer",
    desc: "Quero vender produtos de marcas e faturar comissão sem criar tudo do zero.",
    accent: "accent",
  },
];

export default function RoleSelectCard({ onSelect, selected }: RoleSelectCardProps) {
  return (
    <div className="space-y-3">
      {OPTIONS.map((opt, i) => {
        const Icon = opt.icon;
        const isSel = selected === opt.role;
        const isAccent = opt.accent === "accent";
        return (
          <button
            key={opt.role}
            type="button"
            onClick={() => onSelect(opt.role)}
            style={{ animationDelay: `${i * 70}ms` }}
            className={cn(
              // double-bezel: casca externa (p-[3px]) + transição fluida + entrada escalonada
              "group block w-full text-left rounded-[1.5rem] p-[3px] transition-all duration-300 ease-[var(--ease-fluid)]",
              "animate-[fadeIn_.4s_cubic-bezier(0.32,0.72,0,1)_both]",
              "active:scale-[0.98]",
              isSel
                ? isAccent
                  ? "bg-gradient-to-b from-accent/40 to-accent/5 ring-1 ring-accent/40"
                  : "bg-gradient-to-b from-primary/40 to-primary/5 ring-1 ring-primary/40"
                : "bg-gradient-to-b from-white/[0.07] to-transparent hover:from-white/[0.12]"
            )}
          >
            {/* núcleo interno */}
            <div
              className={cn(
                "flex items-center gap-4 rounded-[1.35rem] p-5 border transition-colors duration-300",
                isSel
                  ? isAccent
                    ? "bg-accent/[0.06] border-accent/20"
                    : "bg-primary/[0.06] border-primary/20"
                  : "bg-background/40 border-white/[0.04] group-hover:border-white/[0.08]"
              )}
            >
              {/* ícone aninhado em círculo */}
              <div
                className={cn(
                  "h-12 w-12 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300",
                  isAccent
                    ? "bg-accent/10 text-accent group-hover:bg-accent/20 ring-1 ring-accent/20"
                    : "bg-primary/10 text-primary group-hover:bg-primary/20 ring-1 ring-primary/20"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold tracking-tight">{opt.title}</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5 leading-snug">
                  {opt.desc}
                </p>
              </div>
              {/* seta em círculo, translada no hover/seleção */}
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full shrink-0 transition-all duration-300 ease-[var(--ease-fluid)]",
                  isSel
                    ? isAccent
                      ? "bg-accent/15 text-accent translate-x-0.5"
                      : "bg-primary/15 text-primary translate-x-0.5"
                    : "bg-white/[0.06] text-muted-foreground/40 group-hover:translate-x-0.5 group-hover:text-foreground"
                )}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
