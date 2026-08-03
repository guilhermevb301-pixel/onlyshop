import { useBrand } from "@/hooks/useBrand";
import { useAuth } from "@/hooks/useAuth";
import { useBrandTeam } from "@/hooks/useBrandTeam";
import { useTeamRewards } from "@/hooks/useTeamRewards";
import { BrandRegistration } from "@/components/brands/BrandRegistration";
import { BrandTeamDashboard } from "@/components/brands/BrandTeamDashboard";
import { RewardsSection } from "@/components/brands/RewardsSection";
import { TeamInviteCard } from "@/components/brands/TeamInviteCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LogIn } from "lucide-react";

// Fase 2 "Meu time" — espelha o gate de BrandArea (auth → login → registro → dashboard).
export default function BrandTeam() {
  const { user, loading: authLoading } = useAuth();
  const { brand, campaigns, loading, createBrand, refetch } = useBrand();
  const { members, loading: teamLoading, refresh: refreshTeam } = useBrandTeam(brand?.id ?? null, campaigns);
  const { rewards, create, setStatus } = useTeamRewards(brand?.id ?? null);

  if (authLoading || loading) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <LogIn className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-display font-bold mb-2">Faça login para continuar</h2>
        <p className="text-muted-foreground mb-6">Você precisa estar logado para acessar seu time.</p>
        <Button asChild className="bg-gradient-primary border-0 text-primary-foreground rounded-full">
          <Link to="/auth">Entrar</Link>
        </Button>
      </div>
    );
  }

  if (!brand) {
    return <BrandRegistration onRegister={createBrand} onDone={refetch} />;
  }

  return (
    <BrandTeamDashboard
      brand={brand}
      members={members}
      loading={teamLoading}
      extraTop={<RewardsSection rewards={rewards} onCreate={create} onCancel={(id) => setStatus(id, "cancelled")} />}
      extraBottom={<TeamInviteCard code={brand.team_invite_code} />}
      onMetaChange={refreshTeam}
    />
  );
}
