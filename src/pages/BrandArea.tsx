import { useBrand } from "@/hooks/useBrand";
import { useAuth } from "@/hooks/useAuth";
import { BrandRegistration } from "@/components/brands/BrandRegistration";
import { BrandDashboard } from "@/components/brands/BrandDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LogIn } from "lucide-react";

export default function BrandArea() {
  const { user, loading: authLoading } = useAuth();
  const {
    brand, campaigns, applications, loading,
    createBrand, createCampaign, markCampaignFunded, approveApplication, refetch,
  } = useBrand();

  if (authLoading || loading) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <Skeleton className="h-10 w-full rounded-full" />
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Em modo real exige login; no demo o useBrand já cai no localStorage.
  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <LogIn className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-display font-bold mb-2">Faça login para continuar</h2>
        <p className="text-muted-foreground mb-6">Você precisa estar logado para acessar a área da loja.</p>
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
    <BrandDashboard
      brand={brand}
      campaigns={campaigns}
      applications={applications}
      onCreateCampaign={createCampaign}
      onFunded={markCampaignFunded}
      onApprove={approveApplication}
    />
  );
}
