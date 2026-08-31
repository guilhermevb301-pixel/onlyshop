import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, TrendingUp, Flame, Filter, DollarSign, Percent, Building2,
  Megaphone, Check, Loader2, ArrowUpRight, BarChart3, Zap, Star, ChevronDown,
  Eye, MousePointer, ShoppingCart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface ProductWithBrand {
  id: string; name: string; description: string | null; image_url: string | null;
  price: number; currency: string; commission_type: string; commission_value: number;
  category: string | null; active: boolean; brand_id: string;
  brands: { name: string; slug: string; logo_url: string | null; verified: boolean } | null;
}

interface CampaignForProduct {
  id: string; name: string; product_id: string | null; brand_id: string; status: string;
  bonus_percentage: number | null;
}

interface SalesStats {
  product_name: string;
  total_sales: number;
  total_amount: number;
}

const CATEGORIES = ["Todos", "Saúde", "Beleza", "Educação", "Tecnologia", "Finanças", "Fitness", "Alimentação", "Moda"];
const SORT_OPTIONS = [
  { label: "Comissão", value: "commission", icon: DollarSign },
  { label: "EPC", value: "epc", icon: Zap },
  { label: "Tendência", value: "trending", icon: TrendingUp },
  { label: "Preço", value: "price", icon: BarChart3 },
];

type SortBy = "commission" | "epc" | "trending" | "price";

export default function Opportunities() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductWithBrand[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignForProduct[]>([]);
  const [myApplications, setMyApplications] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [sortBy, setSortBy] = useState<SortBy>("trending");
  const [clicksMap, setClicksMap] = useState<Map<string, number>>(new Map());
  const [salesMap, setSalesMap] = useState<Map<string, SalesStats>>(new Map());

  const isAffiliate = userRole?.role && ["affiliate", "agency", "brand", "admin"].includes(userRole.role);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      const [productsRes, campaignsRes] = await Promise.all([
        supabase.from("products").select("*, brands(name, slug, logo_url, verified)").eq("active", true).order("created_at", { ascending: false }),
        supabase.from("campaigns").select("id, name, product_id, brand_id, status, bonus_percentage").eq("status", "active"),
      ]);

      setProducts((productsRes.data as ProductWithBrand[]) || []);
      setCampaigns((campaignsRes.data as CampaignForProduct[]) || []);

      // Fetch affiliate link clicks for EPC calculation
      const { data: linksData } = await supabase.from("affiliate_links").select("id, destination_url, clicks_count, conversions_count");
      const clicks = new Map<string, number>();
      linksData?.forEach(l => {
        // Aggregate clicks by extracting product context from URL patterns
        clicks.set(l.id, l.clicks_count || 0);
      });
      setClicksMap(clicks);

      // Fetch recent sales for trending
      const { data: salesData } = await supabase.from("sales").select("product_name, amount").limit(500);
      const sm = new Map<string, SalesStats>();
      salesData?.forEach(s => {
        const existing = sm.get(s.product_name);
        if (existing) {
          existing.total_sales += 1;
          existing.total_amount += Number(s.amount);
        } else {
          sm.set(s.product_name, { product_name: s.product_name, total_sales: 1, total_amount: Number(s.amount) });
        }
      });
      setSalesMap(sm);

      if (user) {
        const { data: apps } = await supabase.from("campaign_affiliates").select("campaign_id").eq("user_id", user.id);
        setMyApplications(new Set(apps?.map(a => a.campaign_id) || []));
      }

      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const getCampaignForProduct = (product: ProductWithBrand): CampaignForProduct | undefined => {
    return campaigns.find(c => c.product_id === product.id || (c.product_id === null && c.brand_id === product.brand_id));
  };

  const getEPC = (product: ProductWithBrand): number => {
    const stats = salesMap.get(product.name);
    if (!stats || stats.total_sales === 0) return 0;
    // Simplified EPC: total commission earned / estimated clicks
    const commissionEarned = stats.total_amount * (product.commission_value / 100);
    const estimatedClicks = Math.max(stats.total_sales * 15, 1); // rough estimate
    return commissionEarned / estimatedClicks;
  };

  const getROI = (product: ProductWithBrand): number => {
    const commission = product.commission_type === "percentage"
      ? product.price * (product.commission_value / 100)
      : product.commission_value;
    return commission;
  };

  const getTrendScore = (product: ProductWithBrand): number => {
    const stats = salesMap.get(product.name);
    const campaign = getCampaignForProduct(product);
    let score = 0;
    if (stats) score += stats.total_sales * 10 + stats.total_amount * 0.01;
    if (campaign) score += 50;
    if (campaign?.bonus_percentage) score += Number(campaign.bonus_percentage) * 5;
    if (product.commission_value > 20) score += 30;
    return score;
  };

  const filtered = useMemo(() => {
    const result = products.filter(p => {
      const ms = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
      const mc = category === "Todos" || p.category === category;
      return ms && mc;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case "commission": return getROI(b) - getROI(a);
        case "epc": return getEPC(b) - getEPC(a);
        case "trending": return getTrendScore(b) - getTrendScore(a);
        case "price": return b.price - a.price;
        default: return 0;
      }
    });

    return result;
  }, [products, search, category, sortBy, salesMap]);

  const handleJoinCampaign = async (campaignId: string) => {
    if (!user) { toast({ variant: "destructive", title: "Faça login primeiro" }); return; }
    if (!isAffiliate) { toast({ variant: "destructive", title: "Torne-se afiliado", description: "Faça upgrade para participar de campanhas" }); return; }
    setJoining(campaignId);
    try {
      const { error } = await supabase.from("campaign_affiliates").insert({ campaign_id: campaignId, user_id: user.id });
      if (error) {
        if (error.code === "23505") toast({ title: "Você já está inscrito nesta campanha" });
        else throw error;
      } else {
        toast({ title: "Inscrição enviada!", description: "Aguarde aprovação da marca" });
        setMyApplications(prev => new Set([...prev, campaignId]));
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    } finally { setJoining(null); }
  };

  const topTrending = useMemo(() => {
    return [...products].sort((a, b) => getTrendScore(b) - getTrendScore(a)).slice(0, 5);
  }, [products, salesMap]);

  const currentSort = SORT_OPTIONS.find(s => s.value === sortBy)!;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Oportunidades</h1>
          </div>
          <p className="text-[11px] text-muted-foreground/40 mt-0.5 ml-10">Feed inteligente de produtos em alta</p>
        </div>
      </div>

      {/* Trending Carousel */}
      {!loading && topTrending.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-accent" />
            <span className="text-[11px] font-semibold text-accent">Em Alta Agora</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1">
            {topTrending.map((product, i) => {
              const epc = getEPC(product);
              const campaign = getCampaignForProduct(product);
              return (
                <div key={product.id} className="shrink-0 w-44 rounded-2xl border border-border/15 bg-card/60 backdrop-blur-sm overflow-hidden group relative">
                  {i < 3 && (
                    <div className="absolute top-2 left-2 z-10 h-5 w-5 rounded-full bg-accent flex items-center justify-center text-[9px] font-bold text-white">
                      {i + 1}
                    </div>
                  )}
                  <div className="aspect-[3/2] bg-muted/20 overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
                        <TrendingUp className="h-6 w-6 text-muted-foreground/15" />
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 space-y-1">
                    <h3 className="font-semibold text-[11px] line-clamp-1">{product.name}</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4 border-success/30 text-success">
                        <DollarSign className="h-2 w-2 mr-0.5" />
                        {Number(product.commission_value)}{product.commission_type === "percentage" ? "%" : ""}
                      </Badge>
                      {epc > 0 && (
                        <span className="text-[8px] text-muted-foreground/50">
                          EPC R${epc.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {campaign && campaign.bonus_percentage && Number(campaign.bonus_percentage) > 0 && (
                      <Badge className="bg-accent/10 text-accent border-0 text-[8px] px-1.5 py-0 h-4">
                        <Megaphone className="h-2 w-2 mr-0.5" /> +{Number(campaign.bonus_percentage)}% bônus
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
            <Input
              placeholder="Buscar produtos, nichos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-10 text-xs rounded-full bg-muted/20 border-border/15"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 rounded-full border-border/15 text-[11px] gap-1.5 px-3">
                <currentSort.icon className="h-3 w-3" />
                {currentSort.label}
                <ChevronDown className="h-3 w-3 text-muted-foreground/40" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              {SORT_OPTIONS.map(opt => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setSortBy(opt.value as SortBy)}
                  className={cn("text-xs gap-2", sortBy === opt.value && "text-primary font-medium")}
                >
                  <opt.icon className="h-3 w-3" /> {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-0.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all shrink-0",
                category === cat
                  ? "bg-foreground text-background"
                  : "text-muted-foreground/40 hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      {!loading && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground/30">
            {filtered.length} oportunidade{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground/30 flex items-center gap-1">
              <Megaphone className="h-2.5 w-2.5" /> {campaigns.length} campanhas ativas
            </span>
          </div>
        </div>
      )}

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/10 p-3 space-y-3">
              <Skeleton className="h-36 rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <Search className="h-8 w-8 mx-auto text-muted-foreground/10 mb-3" />
          <p className="text-sm font-medium">Nenhuma oportunidade encontrada</p>
          <p className="text-[11px] text-muted-foreground/30 mt-0.5">Tente outro nicho ou busca</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(product => {
            const campaign = getCampaignForProduct(product);
            const alreadyJoined = campaign ? myApplications.has(campaign.id) : false;
            const epc = getEPC(product);
            const roi = getROI(product);
            const trendScore = getTrendScore(product);
            const isTrending = trendScore > 50;

            return (
              <div
                key={product.id}
                className={cn(
                  "rounded-2xl border overflow-hidden bg-card/60 backdrop-blur-sm group transition-all duration-300 hover:shadow-md",
                  isTrending ? "border-accent/20" : "border-border/15"
                )}
              >
                {/* Image */}
                <div className="aspect-[16/9] bg-muted/20 relative overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
                      <BarChart3 className="h-8 w-8 text-muted-foreground/10" />
                    </div>
                  )}

                  {/* Badges overlay */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1">
                    {product.commission_value > 0 && (
                      <Badge className="bg-success/90 text-white border-0 text-[9px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                        {product.commission_type === "percentage" ? <Percent className="h-2.5 w-2.5 mr-0.5" /> : <DollarSign className="h-2.5 w-2.5 mr-0.5" />}
                        {Number(product.commission_value)}{product.commission_type === "percentage" ? "%" : ""}
                      </Badge>
                    )}
                  </div>

                  {isTrending && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-accent/90 text-white border-0 text-[9px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                        <Flame className="h-2.5 w-2.5 mr-0.5" /> Trending
                      </Badge>
                    </div>
                  )}

                  {campaign && campaign.bonus_percentage && Number(campaign.bonus_percentage) > 0 && (
                    <div className="absolute bottom-2 left-2">
                      <Badge className="bg-primary/90 text-white border-0 text-[9px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                        <Star className="h-2.5 w-2.5 mr-0.5" /> +{Number(campaign.bonus_percentage)}% bônus
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-3 space-y-2.5">
                  <div>
                    <h3 className="font-semibold text-xs line-clamp-1">{product.name}</h3>
                    {product.description && (
                      <p className="text-[10px] text-muted-foreground/40 line-clamp-2 mt-0.5">{product.description}</p>
                    )}
                  </div>

                  {/* Metrics Row */}
                  <div className="flex items-center gap-3 py-1.5 border-y border-border/10">
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-[8px] text-muted-foreground/30 uppercase tracking-wider">Preço</span>
                      <span className="text-[11px] font-bold">
                        {product.currency === "BRL" ? "R$" : "$"}{Number(product.price).toFixed(0)}
                      </span>
                    </div>
                    <div className="w-px h-6 bg-border/10" />
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-[8px] text-muted-foreground/30 uppercase tracking-wider">Comissão</span>
                      <span className="text-[11px] font-bold text-success">
                        {product.currency === "BRL" ? "R$" : "$"}{roi.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-px h-6 bg-border/10" />
                    <div className="flex flex-col items-center flex-1">
                      <span className="text-[8px] text-muted-foreground/30 uppercase tracking-wider">EPC</span>
                      <span className={cn("text-[11px] font-bold", epc > 0 ? "text-accent" : "text-muted-foreground/20")}>
                        {epc > 0 ? `R$${epc.toFixed(2)}` : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Brand + CTA */}
                  <div className="flex items-center justify-between">
                    {product.brands && (
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-md bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                          {product.brands.logo_url ? (
                            <img src={product.brands.logo_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Building2 className="h-3 w-3 text-muted-foreground/20" />
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground/40 truncate max-w-[80px]">{product.brands.name}</span>
                          {product.brands.verified && (
                            <Check className="h-2.5 w-2.5 text-primary" />
                          )}
                        </div>
                      </div>
                    )}

                    {campaign ? (
                      <Button
                        size="sm"
                        className={cn(
                          "h-7 text-[10px] rounded-full px-3",
                          alreadyJoined
                            ? "bg-success/10 text-success hover:bg-success/20 border-0"
                            : "bg-gradient-to-r from-accent to-primary border-0 text-white"
                        )}
                        disabled={alreadyJoined || joining === campaign.id}
                        onClick={() => handleJoinCampaign(campaign.id)}
                      >
                        {joining === campaign.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : alreadyJoined ? (
                          <><Check className="h-3 w-3 mr-1" /> Inscrito</>
                        ) : (
                          <><ArrowUpRight className="h-3 w-3 mr-1" /> Promover</>
                        )}
                      </Button>
                    ) : (
                      <span className="text-[9px] text-muted-foreground/20">Sem campanha</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
