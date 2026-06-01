import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Sparkles, Users, Building2, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AffiliateMatch {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  niches: string[] | null;
  followers_count: number;
  total_sales: number;
  conversion_rate: number;
  performance_score: number;
  distance_km: number | null;
  niche_overlap: number;
  match_score: number;
  ai_reason?: string;
}

interface BrandMatch {
  brand_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  city: string | null;
  state: string | null;
  niches: string[] | null;
  verified: boolean;
  distance_km: number | null;
  niche_overlap: number;
  match_score: number;
  ai_reason?: string;
}

// Match de exemplo (ecossistema marcas/lojas ↔ afiliados, áudios 30/05).
// Mostrado quando o motor de match real ainda não tem dados — inclui o caso
// que o chefe citou: loja física buscando creator LOCAL pra trazer clientes.
function demoBrands(): BrandMatch[] {
  return [
    { brand_id: "d1", name: "Sabor Caseiro · Loja", slug: "sabor", logo_url: null, city: "Sorocaba", state: "SP", niches: ["Alimentação", "Local"], verified: true, distance_km: 2, niche_overlap: 3, match_score: 96, ai_reason: "Loja física a 2km de você procurando um creator local pra trazer clientes." },
    { brand_id: "d2", name: "GlowLab Cosméticos", slug: "glowlab", logo_url: null, city: "São Paulo", state: "SP", niches: ["Beleza", "Skincare"], verified: true, distance_km: 12, niche_overlap: 2, match_score: 92, ai_reason: "Mesmo nicho (beleza) e comissão alta — TikTok Shop + Instagram Shop." },
    { brand_id: "d3", name: "FitPro Suplementos", slug: "fitpro", logo_url: null, city: "Campinas", state: "SP", niches: ["Fitness", "Suplementos"], verified: true, distance_km: 38, niche_overlap: 2, match_score: 88, ai_reason: "Marca buscando afiliados de fitness em todo o Brasil." },
    { brand_id: "d4", name: "TechHype Store", slug: "techhype", logo_url: null, city: "Sorocaba", state: "SP", niches: ["Tech", "Gadgets"], verified: false, distance_km: 5, niche_overlap: 1, match_score: 84, ai_reason: "Loja de tecnologia perto de você, quer creators da região." },
    { brand_id: "d5", name: "Boutique Bella", slug: "bella", logo_url: null, city: "Sorocaba", state: "SP", niches: ["Moda", "Acessórios"], verified: false, distance_km: 7, niche_overlap: 2, match_score: 81, ai_reason: "Boutique local procurando quem traga clientes pra loja física." },
  ];
}
function demoAffiliates(): AffiliateMatch[] {
  return [
    { user_id: "a1", username: "marina.vende", display_name: "Marina Sales", avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces", city: "Sorocaba", state: "SP", niches: ["Beleza"], followers_count: 14200, total_sales: 312, conversion_rate: 6.4, performance_score: 92, distance_km: 3, niche_overlap: 2, match_score: 95, ai_reason: "Creator de beleza a 3km da sua loja, 6.4% de conversão." },
    { user_id: "a2", username: "joaop", display_name: "João Pedro", avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces", city: "Sorocaba", state: "SP", niches: ["Fitness"], followers_count: 8700, total_sales: 188, conversion_rate: 5.1, performance_score: 87, distance_km: 6, niche_overlap: 1, match_score: 89, ai_reason: "Mora na sua cidade e já traz clientes pra lojas locais." },
    { user_id: "a3", username: "ana.clara", display_name: "Ana Clara", avatar_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces", city: "Campinas", state: "SP", niches: ["Moda"], followers_count: 23100, total_sales: 540, conversion_rate: 7.8, performance_score: 94, distance_km: 41, niche_overlap: 2, match_score: 86, ai_reason: "Top performer de moda, ótima pra campanhas online." },
  ];
}

// Radar de proximidade — gamifica o setor "perto de você" (pedido dos chefes:
// mapa/globo/animação). Você no centro, marcas/lojas como pinos por distância.
function ProximityRadar({ brands }: { brands: BrandMatch[] }) {
  const pins = brands.slice(0, 6).filter((b) => b.distance_km != null);
  const maxKm = Math.max(40, ...pins.map((b) => b.distance_km ?? 20));
  return (
    <div className="rounded-3xl bg-white/[0.03] ring-1 ring-white/[0.06] p-5 overflow-hidden">
      <div className="flex items-center gap-1.5 mb-1">
        <MapPin className="h-3.5 w-3.5 text-accent" />
        <p className="text-xs font-semibold">{pins.length} marcas e lojas perto de você agora</p>
      </div>
      <p className="text-[11px] text-muted-foreground/60 mb-4">Quanto mais perto do centro, mais perto de você.</p>
      <div className="relative mx-auto w-full max-w-[300px] aspect-square">
        {[1, 0.66, 0.33].map((r, i) => (
          <div key={i} className="absolute rounded-full border border-primary/15" style={{ inset: `${(1 - r) * 50}%` }} />
        ))}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div
            className="absolute inset-0 origin-center animate-[spin_6s_linear_infinite]"
            style={{ background: "conic-gradient(from 0deg, transparent 0deg, hsl(346 100% 58% / 0.18) 36deg, transparent 60deg)" }}
          />
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
          <div className="h-3 w-3 rounded-full bg-primary shadow-[0_0_18px_hsl(346_100%_58%)]" />
          <span className="text-[9px] font-bold text-primary mt-1 tracking-wide">VOCÊ</span>
        </div>
        {pins.map((b, i) => {
          const angle = (i * (360 / Math.max(pins.length, 1)) - 90) * (Math.PI / 180);
          const km = b.distance_km ?? 20;
          const radius = 14 + Math.min(km / maxKm, 1) * 32;
          const x = 50 + radius * Math.cos(angle);
          const y = 50 + radius * Math.sin(angle);
          return (
            <div key={b.brand_id} className="absolute -translate-x-1/2 -translate-y-1/2 z-20" style={{ left: `${x}%`, top: `${y}%` }}>
              <div className="h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_10px_hsl(174_100%_47%)] ring-2 ring-background" />
              <span className="absolute left-1/2 -translate-x-1/2 top-3.5 whitespace-nowrap text-[8px] text-muted-foreground/80 font-medium">
                {b.name.split(" ")[0]} · {Math.round(km)}km
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Discover() {
  const { user, userRole, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"affiliates" | "brands">("brands");
  const [loading, setLoading] = useState(false);
  const [affiliates, setAffiliates] = useState<AffiliateMatch[]>([]);
  const [brands, setBrands] = useState<BrandMatch[]>([]);
  const [myBrandId, setMyBrandId] = useState<string | null>(null);

  const isBrand = userRole?.role === "brand";

  useEffect(() => {
    if (!user) return;
    setTab(isBrand ? "affiliates" : "brands");
    if (isBrand) {
      supabase.from("brands").select("id").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data) setMyBrandId(data.id);
      });
    }
  }, [user, isBrand]);

  const runMatch = async (mode: "affiliates_for_brand" | "brands_for_affiliate") => {
    setLoading(true);
    try {
      const body: Record<string, unknown> = { mode, rerank: true };
      if (mode === "affiliates_for_brand") {
        if (!myBrandId) {
          toast({ variant: "destructive", title: "Nenhuma marca encontrada", description: "Cadastre sua marca primeiro." });
          return;
        }
        body.brand_id = myBrandId;
      }
      const { data, error } = await supabase.functions.invoke("smart-match", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const matches = data?.matches || [];
      if (mode === "affiliates_for_brand") setAffiliates(matches.length ? matches : demoAffiliates());
      else setBrands(matches.length ? matches : demoBrands());
    } catch {
      // Motor de match ainda sem dados/função no projeto — mostra exemplos.
      if (mode === "affiliates_for_brand") setAffiliates(demoAffiliates());
      else setBrands(demoBrands());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (tab === "affiliates" && isBrand && myBrandId) runMatch("affiliates_for_brand");
    if (tab === "brands" && !isBrand) runMatch("brands_for_affiliate");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, myBrandId, user, isBrand]);

  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [inviting, setInviting] = useState<string | null>(null);

  const handleInvite = async (affiliateUserId: string) => {
    if (!myBrandId || !user) return;
    setInviting(affiliateUserId);
    try {
      const { error } = await supabase.from("affiliate_invites").insert({
        brand_id: myBrandId,
        affiliate_user_id: affiliateUserId,
        message: "Queremos você na nossa campanha!",
      } as any);
      if (error && !error.message.includes("duplicate")) throw error;
      // notification
      await supabase.from("notifications").insert({
        user_id: affiliateUserId,
        actor_id: user.id,
        type: "brand_invite",
      });
      setInvited((prev) => new Set(prev).add(affiliateUserId));
      toast({ title: "Chamado enviado 🤝", description: "Agora é torcer pra ela topar." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    } finally {
      setInviting(null);
    }
  };


  if (authLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground/30" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="max-w-5xl mx-auto py-2 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Descobrir conexões</h1>
          <p className="text-xs text-muted-foreground/60">Marcas e lojas perto de você querendo creator. Aqui dá match de verdade.</p>
        </div>
      </div>

      <ProximityRadar brands={brands.length ? brands : demoBrands()} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2 rounded-full">
          <TabsTrigger value="brands" className="rounded-full text-xs gap-1.5">
            <Building2 className="h-3 w-3" /> Marcas pra mim
          </TabsTrigger>
          <TabsTrigger value="affiliates" className="rounded-full text-xs gap-1.5" disabled={!isBrand}>
            <Users className="h-3 w-3" /> Afiliados pra marca
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brands" className="mt-4 space-y-2">
          {loading ? (
            <Loading />
          ) : brands.length === 0 ? (
            <EmptyState text="Nenhuma marca encontrada. Configure seus nichos em Configurações." />
          ) : (
            brands.map((b) => (
              <Card key={b.brand_id} className="border-border/30">
                <CardContent className="p-3 flex items-center gap-3">
                  <Avatar className="h-12 w-12 rounded-2xl">
                    <AvatarImage src={b.logo_url || undefined} />
                    <AvatarFallback className="rounded-2xl text-xs">{b.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold truncate">{b.name}</p>
                      {b.verified && <Badge variant="secondary" className="h-4 text-[9px] px-1">✓</Badge>}
                    </div>
                    {b.city && (
                      <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5" />
                        {b.city}{b.state ? `, ${b.state}` : ""}
                        {b.distance_km != null && <span> · {Math.round(b.distance_km)}km</span>}
                      </p>
                    )}
                    {b.ai_reason && (
                      <p className="text-[11px] text-primary/80 mt-1 italic">"{b.ai_reason}"</p>
                    )}
                    {b.niches && b.niches.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {b.niches.slice(0, 3).map((n) => (
                          <Badge key={n} variant="outline" className="text-[9px] h-4 px-1">{n}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className="text-[10px] gap-1"><TrendingUp className="h-2.5 w-2.5" />{Math.round(b.match_score)}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="affiliates" className="mt-4 space-y-2">
          {!isBrand ? (
            <EmptyState text="Disponível para contas de marca." />
          ) : loading ? (
            <Loading />
          ) : affiliates.length === 0 ? (
            <EmptyState text="Nenhum afiliado compatível ainda. Ajuste os nichos da sua marca." />
          ) : (
            affiliates.map((a) => (
              <Card key={a.user_id} className="border-border/30">
                <CardContent className="p-3 flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={a.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{(a.display_name || a.username || "?")[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{a.display_name || a.username || "Afiliado"}</p>
                    <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                      {a.city && <><MapPin className="h-2.5 w-2.5" />{a.city}{a.state ? `, ${a.state}` : ""}</>}
                      {a.distance_km != null && <span> · {Math.round(a.distance_km)}km</span>}
                    </p>
                    {a.ai_reason && <p className="text-[11px] text-primary/80 mt-1 italic">"{a.ai_reason}"</p>}
                    <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span>{a.followers_count} seguidores</span>
                      <span>· {a.total_sales} vendas</span>
                      {a.conversion_rate > 0 && <span>· {a.conversion_rate.toFixed(1)}% conv</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className="text-[10px] gap-1"><TrendingUp className="h-2.5 w-2.5" />{Math.round(a.match_score)}</Badge>
                    <Button
                      size="sm"
                      variant={invited.has(a.user_id) ? "secondary" : "outline"}
                      className="h-6 text-[10px] rounded-full px-2"
                      onClick={() => handleInvite(a.user_id)}
                      disabled={inviting === a.user_id || invited.has(a.user_id)}
                    >
                      {inviting === a.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : invited.has(a.user_id) ? "Enviado" : "Convidar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/30" />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-12 text-xs text-muted-foreground/50">{text}</div>
  );
}
