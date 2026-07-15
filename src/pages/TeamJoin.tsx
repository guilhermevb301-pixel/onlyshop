import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, CheckCircle2, Store, ArrowRight } from "lucide-react";
import { toast } from "sonner";

// Página pública de entrar no time da marca (/time/entrar/:code). O vínculo é feito
// server-side pela função join_team (SECURITY DEFINER) — exige posse do código + login.
export default function TeamJoin() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [brand, setBrand] = useState<{ brand_id: string; brand_name: string; brand_logo: string | null } | null>(null);
  const [resolving, setResolving] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    (async () => {
      if (!code) { setResolving(false); return; }
      try {
        const { data } = await supabase.rpc("resolve_team_invite" as any, { _code: code });
        setBrand((((data as any[]) || [])[0] as any) ?? null);
      } catch {
        setBrand(null);
      } finally {
        setResolving(false);
      }
    })();
  }, [code]);

  const join = async () => {
    if (!user) { navigate("/auth"); return; }
    setJoining(true);
    try {
      const { error } = await supabase.rpc("join_team" as any, { _code: code });
      if (error) throw error;
      setJoined(true);
      toast.success("Você entrou no time!", { description: `Agora você faz parte do time de ${brand?.brand_name ?? "a marca"}.` });
    } catch {
      toast.error("Não foi possível entrar agora");
    } finally {
      setJoining(false);
    }
  };

  if (resolving || authLoading) {
    return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden grid place-items-center px-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full blur-[170px] opacity-[0.12] bg-primary" />
      </div>
      <div className="relative z-10 w-full max-w-sm">
        <div className="rounded-[1.75rem] bg-gradient-to-b from-white/[0.1] to-transparent p-px shadow-[0_24px_80px_-20px_hsl(346_100%_58%/0.3)]">
          <div className="rounded-[1.65rem] bg-card/90 backdrop-blur-xl p-6 ring-1 ring-white/[0.05] text-center">
            {!brand ? (
              <>
                <div className="mx-auto h-16 w-16 rounded-3xl bg-white/[0.05] ring-1 ring-white/10 grid place-items-center mb-4"><Store className="h-8 w-8 text-muted-foreground/40" /></div>
                <h1 className="text-lg font-bold">Convite inválido</h1>
                <p className="text-xs text-muted-foreground/60 mt-1.5">Esse link de time não existe mais. Peça um novo pra marca.</p>
                <Button onClick={() => navigate("/")} variant="outline" className="mt-5 rounded-full border-white/10 bg-white/[0.03]">Voltar</Button>
              </>
            ) : (
              <>
                <div className="mx-auto h-20 w-20 rounded-3xl ring-2 ring-primary/30 overflow-hidden bg-gradient-to-br from-primary/30 to-accent/10 grid place-items-center mb-4">
                  {brand.brand_logo ? <img src={brand.brand_logo} alt={brand.brand_name} className="h-full w-full object-cover" /> : <Store className="h-9 w-9 text-white/90" />}
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-accent/70 font-semibold">Convite de time</span>
                <h1 className="text-xl font-bold tracking-tight mt-1">Entrar no time de {brand.brand_name}</h1>
                <p className="text-xs text-muted-foreground/60 mt-2 leading-relaxed">
                  Você passa a fazer parte do time desta marca — recebe os desafios, recompensas e campanhas dela em primeira mão.
                </p>

                {joined ? (
                  <>
                    <div className="mt-5 rounded-full bg-accent/10 ring-1 ring-accent/30 py-3 flex items-center justify-center gap-2 text-sm font-semibold text-accent">
                      <CheckCircle2 className="h-4 w-4" /> Você está no time!
                    </div>
                    <Button onClick={() => navigate("/mapa")} className="w-full mt-3 h-12 rounded-full gap-2 bg-gradient-primary border-0 font-semibold">
                      Ir pro app <ArrowRight className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button onClick={join} disabled={joining} className="w-full mt-5 h-12 rounded-full gap-2 bg-gradient-primary border-0 font-semibold text-base shadow-[var(--shadow-glow-cta)]">
                    {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    {user ? "Entrar no time" : "Entrar / cadastrar pra participar"}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        <p className="text-center text-[10px] text-muted-foreground/30 mt-6">OnlyShop · onlyshopbrasil.com.br</p>
      </div>
    </div>
  );
}
