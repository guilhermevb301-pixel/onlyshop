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
    desc: "Quero creators vendendo meus produtos com IA — sem precisar aparecer.",
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
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isSel = selected === opt.role;
        const isAccent = opt.accent === "accent";
        return (
          <button
            key={opt.role}
            type="button"
            onClick={() => onSelect(opt.role)}
            className={cn(
              "group w-full text-left rounded-3xl p-5 border transition-all",
              "bg-muted/20 hover:bg-muted/30 active:scale-[0.99]",
              isSel
                ? isAccent
                  ? "border-accent/50 ring-2 ring-accent/30 bg-accent/5"
                  : "border-primary/50 ring-2 ring-primary/30 bg-primary/5"
                : "border-border/15 hover:border-border/30"
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                  isAccent
                    ? "bg-accent/10 text-accent group-hover:bg-accent/15"
                    : "bg-primary/10 text-primary group-hover:bg-primary/15"
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold tracking-tight">{opt.title}</p>
                <p className="text-[11px] text-muted-foreground/50 mt-0.5 leading-snug">
                  {opt.desc}
                </p>
              </div>
              <ArrowRight
                className={cn(
                  "h-4 w-4 shrink-0 transition-all",
                  isSel
                    ? isAccent
                      ? "text-accent translate-x-0.5"
                      : "text-primary translate-x-0.5"
                    : "text-muted-foreground/20 group-hover:translate-x-0.5"
                )}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
