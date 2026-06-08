import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Link2, Plus, Copy, TrendingUp, MousePointer, ShoppingCart, DollarSign,
  Loader2, Trash2, Clock, CheckCircle, ArrowUpDown, Package, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { validateAffiliateUrl } from "@/lib/urlValidation";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";

interface AffiliateLink {
  id: string; name: string; short_code: string; destination_url: string;
  clicks_count: number; conversions_count: number; created_at: string;
}

interface Commission {
  id: string; amount: number; percentage: number; status: string;
  created_at: string; paid_at: string | null;
}

interface DashboardStats {
  totalClicks: number; totalConversions: number; totalEarnings: number;
  pendingEarnings: number; conversionRate: number;
}

// Secure short code generator with collision check
async function generateUniqueShortCode(): Promise<string> {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars
  for (let attempt = 0; attempt < 5; attempt++) {
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    const code = Array.from(arr).map(b => chars[b % chars.length]).join("");
    
    const { data } = await supabase
      .from("affiliate_links")
      .select("id")
      .eq("short_code", code)
      .maybeSingle();
    
    if (!data) return code;
  }
  throw new Error("Não foi possível gerar um código único");
}

export default function Affiliate() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ totalClicks: 0, totalConversions: 0, totalEarnings: 0, pendingEarnings: 0, conversionRate: 0 });
  const [chartData, setChartData] = useState<{ date: string; cliques: number; conversões: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newLink, setNewLink] = useState({ name: "", destinationUrl: "" });
  const [sortBy, setSortBy] = useState<"recent" | "clicks" | "conversions">("recent");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isAffiliate = userRole?.role && ["affiliate", "agency", "brand", "admin"].includes(userRole.role);

  useEffect(() => { if (user && isAffiliate) fetchData(); else setLoading(false); }, [user, isAffiliate]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [{ data: linksData }, { data: commissionsData }, { data: clicksData }] = await Promise.all([
        supabase.from("affiliate_links").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("commissions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("link_clicks").select("clicked_at, affiliate_link_id").order("clicked_at", { ascending: false }).limit(500),
      ]);

      setLinks(linksData || []);
      setCommissions(commissionsData || []);

      const totalClicks = linksData?.reduce((s, l) => s + l.clicks_count, 0) || 0;
      const totalConversions = linksData?.reduce((s, l) => s + l.conversions_count, 0) || 0;
      const totalEarnings = commissionsData?.filter(c => c.status === "paid").reduce((s, c) => s + Number(c.amount), 0) || 0;
      const pendingEarnings = commissionsData?.filter(c => c.status === "pending").reduce((s, c) => s + Number(c.amount), 0) || 0;
      setStats({ totalClicks, totalConversions, totalEarnings, pendingEarnings, conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0 });

      // Build 14-day chart
      const userLinkIds = new Set(linksData?.map(l => l.id) || []);
      const chart: typeof chartData = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        const dayStr = d.toISOString().slice(0, 10);
        const dayClicks = clicksData?.filter(c => userLinkIds.has(c.affiliate_link_id) && c.clicked_at.startsWith(dayStr)).length || 0;
        chart.push({ date: label, cliques: dayClicks, conversões: 0 });
      }
      setChartData(chart);
    } catch (error) { console.error("Error:", error); } finally { setLoading(false); }
  };

  const handleCreateLink = async () => {
    if (!newLink.name.trim() || !newLink.destinationUrl.trim() || !user) return;
    const urlValidation = validateAffiliateUrl(newLink.destinationUrl);
    if (!urlValidation.isValid) { toast({ variant: "destructive", title: "URL inválida", description: urlValidation.error }); return; }
    setIsCreating(true);
    try {
      const shortCode = await generateUniqueShortCode();
      await supabase.from("affiliate_links").insert({
        user_id: user.id, name: newLink.name.trim(),
        destination_url: newLink.destinationUrl.trim(), short_code: shortCode,
      });
      toast({ title: "Link criado!" }); setNewLink({ name: "", destinationUrl: "" }); fetchData();
    } catch (error: any) { toast({ variant: "destructive", title: "Erro", description: error.message }); } finally { setIsCreating(false); }
  };

  const handleCopyLink = async (link: AffiliateLink) => {
    await navigator.clipboard.writeText(`${window.location.origin}/r/${link.short_code}`);
    setCopiedId(link.id);
    toast({ title: "Link copiado!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteLink = async (id: string) => {
    await supabase.from("affiliate_links").delete().eq("id", id);
    toast({ title: "Link removido" });
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const sortedLinks = [...links].sort((a, b) => {
    if (sortBy === "clicks") return b.clicks_count - a.clicks_count;
    if (sortBy === "conversions") return b.conversions_count - a.conversions_count;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (loading) return (
    <div className="max-w-5xl mx-auto py-2 space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-20 rounded-2xl bg-muted/20 animate-pulse" />
      ))}
    </div>
  );

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 p-6 text-center">
      <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center"><Link2 className="h-5 w-5 text-muted-foreground/30" /></div>
      <h2 className="text-base font-bold">Faça login</h2>
      <p className="text-xs text-muted-foreground/40 max-w-xs">Acesse para ver seu painel de afiliados</p>
      <Button asChild size="sm" className="mt-2 rounded-full"><Link to="/auth">Entrar</Link></Button>
    </div>
  );

  if (!isAffiliate) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 p-6 text-center">
      <div className="h-14 w-14 rounded-2xl bg-primary/5 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-primary/50" /></div>
      <h2 className="text-base font-bold">Torne-se Afiliado</h2>
      <p className="text-xs text-muted-foreground/40 max-w-xs">Upgrade para Partner ou superior</p>
      <Button asChild size="sm" className="mt-2 rounded-full"><a href="/#plans">Ver Planos</a></Button>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div>
        <h1 className="text-lg font-bold tracking-tight">Afiliados</h1>
        <p className="text-[11px] text-muted-foreground/40">Links, performance e comissões</p>
      </div>

      {/* Wallet Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-background border border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest font-semibold">Saldo disponível</p>
            <p className="text-2xl font-black mt-0.5">{fmt(stats.totalEarnings)}</p>
          </div>
          <Button asChild size="sm" className="rounded-full text-[10px] h-8 gap-1.5">
            <Link to="/wallet">
              <DollarSign className="h-3 w-3" />
              Wallet
            </Link>
          </Button>
        </div>
        <div className="flex gap-4 text-[10px]">
          <span className="text-muted-foreground/50">Pendente: <strong className="text-warning">{fmt(stats.pendingEarnings)}</strong></span>
          <span className="text-muted-foreground/50">Conversão: <strong className="text-primary">{stats.conversionRate.toFixed(1)}%</strong></span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: MousePointer, label: "Cliques", value: stats.totalClicks.toString(), color: "text-primary" },
          { icon: ShoppingCart, label: "Conversões", value: stats.totalConversions.toString(), color: "text-accent" },
          { icon: DollarSign, label: "Recebido", value: fmt(stats.totalEarnings), color: "text-primary" },
          { icon: Clock, label: "Pendente", value: fmt(stats.pendingEarnings), color: "text-warning" },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-2xl bg-muted/20 border border-border/15 text-center">
            <s.icon className={cn("h-3.5 w-3.5 mx-auto mb-1", s.color)} />
            <p className="text-sm font-bold">{s.value}</p>
            <span className="text-[8px] text-muted-foreground/30 uppercase tracking-wider font-semibold">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Performance Chart */}
      <div className="p-4 rounded-2xl bg-muted/20 border border-border/15">
        <p className="text-xs font-semibold mb-3">Performance — 14 dias</p>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="affClicks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="affConv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 11 }} />
              <Area type="monotone" dataKey="cliques" stroke="hsl(var(--primary))" fill="url(#affClicks)" strokeWidth={2} />
              <Area type="monotone" dataKey="conversões" stroke="hsl(var(--accent))" fill="url(#affConv)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="links" className="w-full">
        <TabsList className="w-full h-9 p-0.5 bg-muted/30 rounded-full border-0">
          <TabsTrigger value="links" className="flex-1 text-[11px] h-8 rounded-full">Links ({links.length})</TabsTrigger>
          <TabsTrigger value="commissions" className="flex-1 text-[11px] h-8 rounded-full">Comissões ({commissions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="links" className="mt-4 space-y-3">
          <div className="flex gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button className="flex-1 gap-2 h-10 text-xs rounded-full bg-foreground text-background hover:bg-foreground/90">
                  <Plus className="h-3.5 w-3.5" />Criar link
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl border-border/20">
                <SheetHeader>
                  <SheetTitle className="text-base">Criar Link</SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground/40">Link rastreável com código único seguro</SheetDescription>
                </SheetHeader>
                <div className="space-y-3 py-4">
                  <div><Label className="text-[11px] text-muted-foreground/50">Nome</Label><Input placeholder="Ex: Curso de Marketing" className="h-10 text-sm rounded-xl mt-1 border-border/20" value={newLink.name} onChange={(e) => setNewLink(p => ({ ...p, name: e.target.value }))} /></div>
                  <div><Label className="text-[11px] text-muted-foreground/50">URL destino</Label><Input placeholder="https://..." type="url" className="h-10 text-sm rounded-xl mt-1 border-border/20" value={newLink.destinationUrl} onChange={(e) => setNewLink(p => ({ ...p, destinationUrl: e.target.value }))} /></div>
                </div>
                <SheetFooter className="gap-2">
                  <SheetClose asChild><Button variant="ghost" size="sm" className="rounded-full">Cancelar</Button></SheetClose>
                  <Button size="sm" onClick={handleCreateLink} disabled={!newLink.name.trim() || !newLink.destinationUrl.trim() || isCreating} className="rounded-full bg-foreground text-background">
                    {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Criar"}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>

            <Button asChild variant="outline" size="icon" className="h-10 w-10 rounded-full border-border/20 shrink-0">
              <Link to="/products"><Package className="h-4 w-4" /></Link>
            </Button>
          </div>

          {/* Sort */}
          {links.length > 1 && (
            <div className="flex justify-end">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-auto h-7 text-[10px] border-border/15 rounded-full px-3 gap-1">
                  <ArrowUpDown className="h-3 w-3" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recentes</SelectItem>
                  <SelectItem value="clicks">Mais cliques</SelectItem>
                  <SelectItem value="conversions">Mais conversões</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {links.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Link2 className="h-10 w-10 mx-auto text-muted-foreground/10" />
              <div>
                <p className="text-sm font-medium">Nenhum link criado</p>
                <p className="text-[11px] text-muted-foreground/30 mt-1">Crie seu primeiro link ou explore o catálogo de produtos</p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-full text-xs">
                <Link to="/products"><Package className="h-3.5 w-3.5 mr-1.5" /> Ver Produtos</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedLinks.map((link) => (
                <div key={link.id} className="p-4 rounded-2xl border border-border/15 bg-background">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{link.name}</p>
                      <p className="text-[10px] text-muted-foreground/30 truncate mt-0.5 flex items-center gap-1">
                        <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                        {link.destination_url}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[11px]">
                        <span className="flex items-center gap-1 text-muted-foreground/40"><MousePointer className="h-3 w-3" />{link.clicks_count}</span>
                        <span className="flex items-center gap-1 text-success"><ShoppingCart className="h-3 w-3" />{link.conversions_count}</span>
                        <span className="text-muted-foreground/20 text-[9px]">{formatDistanceToNow(new Date(link.created_at), { addSuffix: true, locale: ptBR })}</span>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      <Button
                        variant="ghost" size="icon"
                        className={cn("h-8 w-8 rounded-full transition-colors", copiedId === link.id ? "text-success" : "text-muted-foreground/30")}
                        onClick={() => handleCopyLink(link)}
                      >
                        {copiedId === link.id ? <CheckCircle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive/30 hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover link?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{link.name}" será removido permanentemente. Todos os dados de rastreamento serão perdidos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteLink(link.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="commissions" className="mt-4 space-y-2">
          {commissions.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <DollarSign className="h-10 w-10 mx-auto text-muted-foreground/10" />
              <div>
                <p className="text-sm font-medium">Nenhuma comissão ainda</p>
                <p className="text-[11px] text-muted-foreground/30 mt-1">Compartilhe seus links para começar a ganhar</p>
              </div>
            </div>
          ) : (
            commissions.map((c) => (
              <div key={c.id} className="p-4 rounded-2xl border border-border/15 bg-background flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-success">{fmt(Number(c.amount))}</p>
                  <p className="text-[10px] text-muted-foreground/30 mt-0.5">{c.percentage}% · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}</p>
                </div>
                <Badge variant="secondary" className={cn("text-[9px] rounded-full border-0 gap-1", c.status === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning")}>
                  {c.status === "paid" ? <><CheckCircle className="h-2.5 w-2.5" /> Pago</> : <><Clock className="h-2.5 w-2.5" /> Pendente</>}
                </Badge>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
