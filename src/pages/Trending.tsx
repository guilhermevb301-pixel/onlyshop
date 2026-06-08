import { useEffect, useState, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame, Loader2, TrendingUp, Hash, Video, Package, Eye, ArrowUpRight, Sparkles } from "lucide-react";

// =============================================================================
// Em Alta — indicadores do TikTok (Creative Center) dentro do OnlyShop.
// O afiliado entra e já vê O QUE vender e o norte: produtos/hashtags/criativos
// bombando por país. Dados reais via edge function tiktok-trends (Apify);
// enquanto a chave do Apify não está ligada, mostra exemplos realistas.
// =============================================================================

type TrendType = "products" | "hashtags" | "creatives";

interface ProductTrend { rank: number; name: string; category: string; priceRange: string; growth: number; }
interface HashtagTrend { rank: number; name: string; posts: string; growth: number; }
interface CreativeTrend { rank: number; title: string; format: string; views: string; engagement: number; }

const COUNTRIES = [
  { code: "BR", label: "🇧🇷 Brasil" },
  { code: "US", label: "🇺🇸 EUA" },
  { code: "PT", label: "🇵🇹 Portugal" },
  { code: "MX", label: "🇲🇽 México" },
  { code: "ES", label: "🇪🇸 Espanha" },
  { code: "GB", label: "🇬🇧 Reino Unido" },
];

const PRODUCT_CATEGORIES = ["", "Beleza", "Tech", "Fitness", "Casa", "Moda", "Pet", "Gastronomia"];

// Cor/ícone por categoria — visual coeso sem depender de foto de SKU.
const CAT_STYLE: Record<string, string> = {
  Beleza: "from-pink-500/30 to-rose-500/10",
  Tech: "from-blue-500/30 to-cyan-500/10",
  Fitness: "from-emerald-500/30 to-green-500/10",
  Casa: "from-amber-500/30 to-orange-500/10",
  Moda: "from-purple-500/30 to-fuchsia-500/10",
  Pet: "from-teal-500/30 to-cyan-500/10",
  Gastronomia: "from-red-500/30 to-orange-500/10",
  default: "from-primary/30 to-accent/10",
};

// ---- Exemplos realistas (modo demo) ----------------------------------------
const DEMO_PRODUCTS: ProductTrend[] = [
  { rank: 1, name: "Sérum Ácido Hialurônico", category: "Beleza", priceRange: "R$ 29–59", growth: 340 },
  { rank: 2, name: "Massageador Facial Gua Sha", category: "Beleza", priceRange: "R$ 19–39", growth: 290 },
  { rank: 3, name: "Fone TWS Bluetooth", category: "Tech", priceRange: "R$ 49–99", growth: 245 },
  { rank: 4, name: "Garrafa Térmica 2L Motivacional", category: "Fitness", priceRange: "R$ 39–69", growth: 210 },
  { rank: 5, name: "Kit Pincéis de Maquiagem", category: "Beleza", priceRange: "R$ 25–55", growth: 195 },
  { rank: 6, name: "Luminária Lua 3D", category: "Casa", priceRange: "R$ 35–75", growth: 180 },
  { rank: 7, name: "Corretivo Alta Cobertura", category: "Beleza", priceRange: "R$ 22–45", growth: 165 },
  { rank: 8, name: "Mini Ventilador Portátil", category: "Tech", priceRange: "R$ 29–59", growth: 150 },
  { rank: 9, name: "Whey Protein Sachê", category: "Fitness", priceRange: "R$ 9–19", growth: 140 },
  { rank: 10, name: "Perfume Decant Importado", category: "Beleza", priceRange: "R$ 30–80", growth: 130 },
  { rank: 11, name: "Organizador de Maquiagem", category: "Casa", priceRange: "R$ 25–49", growth: 120 },
  { rank: 12, name: "Tênis Chunky Sneaker", category: "Moda", priceRange: "R$ 89–159", growth: 110 },
];

const DEMO_HASHTAGS: HashtagTrend[] = [
  { rank: 1, name: "tiktokmefezcomprar", posts: "2.4M", growth: 180 },
  { rank: 2, name: "achadinhos", posts: "1.8M", growth: 120 },
  { rank: 3, name: "tiktokshop", posts: "1.3M", growth: 220 },
  { rank: 4, name: "skincarebrasil", posts: "760K", growth: 140 },
  { rank: 5, name: "achadinhosbeleza", posts: "640K", growth: 110 },
  { rank: 6, name: "unboxing", posts: "590K", growth: 75 },
  { rank: 7, name: "resenha", posts: "480K", growth: 85 },
  { rank: 8, name: "promocao", posts: "420K", growth: 50 },
  { rank: 9, name: "receitafacil", posts: "390K", growth: 60 },
  { rank: 10, name: "maquiagem", posts: "350K", growth: 40 },
];

const DEMO_CREATIVES: CreativeTrend[] = [
  { rank: 1, title: "Antes e depois — skincare 30 dias", format: "Review / UGC", views: "4.2M", engagement: 12 },
  { rank: 2, title: "Unboxing achadinho de R$20", format: "Unboxing", views: "3.1M", engagement: 9 },
  { rank: 3, title: "POV: você descobriu esse produto", format: "POV", views: "2.8M", engagement: 11 },
  { rank: 4, title: "Testei por 7 dias e olha o resultado", format: "Review", views: "2.3M", engagement: 8 },
  { rank: 5, title: "3 produtos que mudaram minha rotina", format: "Lista", views: "1.9M", engagement: 10 },
  { rank: 6, title: "Tutorial rápido — como usar", format: "Tutorial", views: "1.5M", engagement: 7 },
];

export default function Trending() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TrendType>("products");
  const [country, setCountry] = useState("BR");
  const [period, setPeriod] = useState<"1" | "7" | "30">("7");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductTrend[]>([]);
  const [hashtags, setHashtags] = useState<HashtagTrend[]>([]);
  const [creatives, setCreatives] = useState<CreativeTrend[]>([]);
  const [isDemo, setIsDemo] = useState(false);

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("tiktok-trends", {
        body: { type: tab, country, period: Number(period), category: category || undefined },
      });
      const items: any[] = !error && data?.items?.length ? data.items : [];
      const demo = !items.length;
      setIsDemo(demo);

      if (tab === "products") {
        setProducts(demo ? DEMO_PRODUCTS : items.map(normalizeProduct));
      } else if (tab === "hashtags") {
        setHashtags(demo ? DEMO_HASHTAGS : items.map(normalizeHashtag));
      } else {
        setCreatives(demo ? DEMO_CREATIVES : items.map(normalizeCreative));
      }
    } catch {
      // Função ainda não publicada / sem token → exemplos.
      setIsDemo(true);
      if (tab === "products") setProducts(DEMO_PRODUCTS);
      else if (tab === "hashtags") setHashtags(DEMO_HASHTAGS);
      else setCreatives(DEMO_CREATIVES);
    } finally {
      setLoading(false);
    }
  }, [tab, country, period, category]);

  useEffect(() => {
    if (user) fetchTrends();
  }, [user, fetchTrends]);

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground/30" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="max-w-5xl mx-auto py-2 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shrink-0">
          <Flame className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Em Alta no TikTok</h1>
          <p className="text-xs text-muted-foreground/60">O que tá bombando agora — descubra o que vender e o norte.</p>
        </div>
      </div>

      {isDemo && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 px-3 py-2 text-[11px] text-amber-600 dark:text-amber-400">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          Exemplos de tendência. Conecte o Apify pra puxar os dados reais do TikTok Creative Center.
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as TrendType)}>
        <TabsList className="grid w-full grid-cols-3 rounded-full">
          <TabsTrigger value="products" className="rounded-full text-xs gap-1.5"><Package className="h-3 w-3" /> Produtos</TabsTrigger>
          <TabsTrigger value="hashtags" className="rounded-full text-xs gap-1.5"><Hash className="h-3 w-3" /> Hashtags</TabsTrigger>
          <TabsTrigger value="creatives" className="rounded-full text-xs gap-1.5"><Video className="h-3 w-3" /> Criativos</TabsTrigger>
        </TabsList>

        {/* Filtros */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="h-9 rounded-full text-xs border-border/30"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="h-9 rounded-full text-xs border-border/30"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">24 horas</SelectItem>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
            </SelectContent>
          </Select>
          {tab === "products" ? (
            <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
              <SelectTrigger className="h-9 rounded-full text-xs border-border/30"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {PRODUCT_CATEGORIES.filter(Boolean).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : <div />}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground/30" /></div>
        ) : (
          <>
            {/* PRODUTOS */}
            <TabsContent value="products" className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                {products
                  .filter((p) => !category || p.category === category)
                  .map((p) => (
                    <Card
                      key={p.rank}
                      onClick={() => navigate("/products")}
                      className="border-border/30 overflow-hidden cursor-pointer hover:border-border/60 transition-colors active:scale-[0.98]"
                    >
                      <div className={`aspect-[16/9] bg-gradient-to-br ${CAT_STYLE[p.category] || CAT_STYLE.default} relative flex items-center justify-center`}>
                        <Package className="h-7 w-7 text-foreground/40" />
                        <Badge className="absolute top-2 left-2 text-[10px] bg-background/80 backdrop-blur text-foreground">#{p.rank}</Badge>
                        <Badge className="absolute top-2 right-2 text-[10px] gap-1 bg-emerald-500 text-white border-0">
                          <TrendingUp className="h-2.5 w-2.5" />+{p.growth}%
                        </Badge>
                      </div>
                      <CardContent className="p-2.5 space-y-1">
                        <p className="text-xs font-bold truncate">{p.name}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[9px] h-4 px-1">{p.category}</Badge>
                          <span className="text-[11px] font-semibold text-muted-foreground">{p.priceRange}</span>
                        </div>
                        <button className="w-full mt-1 text-[10px] font-semibold text-primary flex items-center justify-center gap-0.5 hover:underline">
                          Promover <ArrowUpRight className="h-2.5 w-2.5" />
                        </button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>

            {/* HASHTAGS */}
            <TabsContent value="hashtags" className="mt-4 space-y-2">
              {hashtags.map((h) => (
                <Card key={h.rank} className="border-border/30">
                  <CardContent className="p-3 flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground/40 w-5 text-center">{h.rank}</span>
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Hash className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">#{h.name}</p>
                      <p className="text-[11px] text-muted-foreground/60">{h.posts} posts</p>
                    </div>
                    <Badge className="text-[10px] gap-1 bg-emerald-500 text-white border-0">
                      <TrendingUp className="h-2.5 w-2.5" />+{h.growth}%
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* CRIATIVOS */}
            <TabsContent value="creatives" className="mt-4 space-y-2">
              {creatives.map((c) => (
                <Card key={c.rank} className="border-border/30">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-14 w-10 rounded-lg bg-gradient-to-br from-primary/30 to-accent/10 flex items-center justify-center shrink-0 relative">
                      <Video className="h-4 w-4 text-foreground/50" />
                      <Badge className="absolute -top-1.5 -left-1.5 text-[9px] h-4 px-1 bg-background/90 text-foreground">#{c.rank}</Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold leading-tight line-clamp-2">{c.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground/60">
                        <Badge variant="outline" className="text-[9px] h-4 px-1">{c.format}</Badge>
                        <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" />{c.views}</span>
                        <span>· {c.engagement}% eng</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

// ---- Normalizadores (best-effort) ------------------------------------------
// O formato exato vem do actor do Apify; mapeamos campos comuns com fallback.
function normalizeProduct(it: any, i: number): ProductTrend {
  return {
    rank: it.rank ?? i + 1,
    name: it.title || it.name || it.product_name || "Produto",
    category: it.category || it.industry || "—",
    priceRange: it.price_range || it.price || "—",
    growth: Math.round(it.growth ?? it.popularity ?? it.trend_score ?? 0),
  };
}
function normalizeHashtag(it: any, i: number): HashtagTrend {
  return {
    rank: it.rank ?? i + 1,
    name: (it.hashtag_name || it.name || it.hashtag || "").replace(/^#/, ""),
    posts: it.posts || it.publish_cnt || it.video_count || "—",
    growth: Math.round(it.growth ?? it.trend ?? it.rank_diff ?? 0),
  };
}
function normalizeCreative(it: any, i: number): CreativeTrend {
  return {
    rank: it.rank ?? i + 1,
    title: it.title || it.caption || it.name || "Criativo",
    format: it.format || it.objective || it.type || "Vídeo",
    views: it.views || it.view_count || it.play || "—",
    engagement: Math.round(it.engagement ?? it.engagement_rate ?? it.like_rate ?? 0),
  };
}
