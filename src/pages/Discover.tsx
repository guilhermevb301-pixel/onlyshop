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
      if (mode === "affiliates_for_brand") setAffiliates(data?.matches || []);
      else setBrands(data?.matches || []);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro no matching", description: e.message });
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
      toast({ title: "Convite enviado!" });
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
          <h1 className="text-lg font-bold tracking-tight">Descobrir</h1>
          <p className="text-xs text-muted-foreground/60">Match inteligente: nicho + proximidade + performance</p>
        </div>
      </div>

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
