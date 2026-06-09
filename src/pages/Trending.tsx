import { useEffect, useState, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame, Loader2, TrendingUp, Hash, Video, Package, Eye, Heart, ArrowUpRight, Sparkles, Play } from "lucide-react";

// =============================================================================
// Em Alta — indicadores do TikTok (Creative Center) dentro do OnlyShop.
// Dados reais via /api/trends (Apify). Hashtags e Criativos vêm ao vivo;
// Produtos do Shop são protegidos (caem em exemplos por enquanto).
// =============================================================================

type TrendType = "products" | "hashtags" | "creatives";

interface ProductTrend { rank: number; name: string; category: string; priceRange?: string; growth: number; }
interface HashtagTrend { rank: number; name: string; views: number; posts: number; trend: string; }
interface CreativeTrend { rank: number; title: string; author: string; handle?: string; views: number; likes: number; cover?: string; url?: string; sound?: string; }

const COUNTRIES = [
  { code: "BR", label: "🇧🇷 Brasil" },
  { code: "US", label: "🇺🇸 EUA" },
  { code: "PT", label: "🇵🇹 Portugal" },
  { code: "MX", label: "🇲🇽 México" },
  { code: "ES", label: "🇪🇸 Espanha" },
  { code: "GB", label: "🇬🇧 Reino Unido" },
];

const PRODUCT_CATEGORIES = ["", "Beleza", "Tech", "Fitness", "Casa", "Moda", "Pet", "Gastronomia"];

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

function fmtNum(n: number): string {
  if (!n) return "0";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return String(n);
}

// ---- Exemplos (fallback quando a fonte real não responde) ------------------
const DEMO_PRODUCTS: ProductTrend[] = [
  { rank: 1, name: "Sérum Ácido Hialurônico", category: "Beleza", priceRange: "R$ 29–59", growth: 340 },
  { rank: 2, name: "Massageador Facial Gua Sha", category: "Beleza", priceRange: "R$ 19–39", growth: 290 },
  { rank: 3, name: "Fone TWS Bluetooth", category: "Tech", priceRange: "R$ 49–99", growth: 245 },
  { rank: 4, name: "Garrafa Térmica 2L", category: "Fitness", priceRange: "R$ 39–69", growth: 210 },
  { rank: 5, name: "Kit Pincéis de Maquiagem", category: "Beleza", priceRange: "R$ 25–55", growth: 195 },
  { rank: 6, name: "Luminária Lua 3D", category: "Casa", priceRange: "R$ 35–75", growth: 180 },
  { rank: 7, name: "Corretivo Alta Cobertura", category: "Beleza", priceRange: "R$ 22–45", growth: 165 },
  { rank: 8, name: "Mini Ventilador Portátil", category: "Tech", priceRange: "R$ 29–59", growth: 150 },
];
const DEMO_HASHTAGS: HashtagTrend[] = [
  { rank: 1, name: "viral", views: 700990285, posts: 26, trend: "stable" },
  { rank: 2, name: "fyp", views: 540210000, posts: 31, trend: "up" },
  { rank: 3, name: "achadinhos", views: 188400000, posts: 22, trend: "up" },
  { rank: 4, name: "tiktokmefezcomprar", views: 142300000, posts: 18, trend: "up" },
  { rank: 5, name: "skincare", views: 98700000, posts: 27, trend: "stable" },
  { rank: 6, name: "receitafacil", views: 76500000, posts: 19, trend: "down" },
];
const DEMO_CREATIVES: CreativeTrend[] = [
  { rank: 1, title: "Antes e depois — skincare 30 dias", author: "Bia Rocha", handle: "bia.skin", views: 4200000, likes: 413000, sound: "som original" },
  { rank: 2, title: "Unboxing achadinho de R$20", author: "Marina", handle: "marina.vende", views: 3100000, likes: 287000, sound: "trending" },
  { rank: 3, title: "POV: você descobriu esse produto", author: "João Pedro", handle: "joaop", views: 2800000, likes: 195000, sound: "som original" },
  { rank: 4, title: "Testei por 7 dias e olha", author: "Ana Clara", handle: "ana.clara", views: 2300000, likes: 168000, sound: "trending" },
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
      const res = await fetch(`/api/trends?type=${tab}&country=${country}&period=${period}&limit=24`);
      const data = await res.json();
      const items: any[] = Array.isArray(data?.items) ? data.items : [];
      const demo = !items.length;
      setIsDemo(demo);
      if (tab === "products") setProducts(demo ? DEMO_PRODUCTS : items);
      else if (tab === "hashtags") setHashtags(demo ? DEMO_HASHTAGS : items);
      else setCreatives(demo ? DEMO_CREATIVES : items);
    } catch {
      setIsDemo(true);
      if (tab === "products") setProducts(DEMO_PRODUCTS);
      else if (tab === "hashtags") setHashtags(DEMO_HASHTAGS);
      else setCreatives(DEMO_CREATIVES);
    } finally {
      setLoading(false);
    }
  }, [tab, country, period]);

  useEffect(() => { if (user) fetchTrends(); }, [user, fetchTrends]);

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
          {tab === "products"
            ? "Produtos do TikTok Shop são protegidos — exemplos por enquanto. Hashtags e Criativos já vêm ao vivo."
            : "Exemplos — a fonte ao vivo não respondeu agora. Tente recarregar."}
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
            <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}</SelectContent>
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
                {products.filter((p) => !category || p.category === category).map((p) => (
                  <Card key={p.rank} onClick={() => navigate("/products")}
                    className="border-border/30 overflow-hidden cursor-pointer hover:border-border/60 transition-colors active:scale-[0.98]">
                    <div className={`aspect-[16/9] bg-gradient-to-br ${CAT_STYLE[p.category] || CAT_STYLE.default} relative flex items-center justify-center`}>
                      <Package className="h-7 w-7 text-foreground/40" />
                      <Badge className="absolute top-2 left-2 text-[10px] bg-background/80 backdrop-blur text-foreground">#{p.rank}</Badge>
                      {p.growth > 0 && (
                        <Badge className="absolute top-2 right-2 text-[10px] gap-1 bg-emerald-500 text-white border-0">
                          <TrendingUp className="h-2.5 w-2.5" />+{p.growth}%
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-2.5 space-y-1">
                      <p className="text-xs font-bold truncate">{p.name}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[9px] h-4 px-1">{p.category}</Badge>
                        {p.priceRange && <span className="text-[11px] font-semibold text-muted-foreground">{p.priceRange}</span>}
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
                      <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                        <Eye className="h-2.5 w-2.5" />{fmtNum(h.views)} views{h.posts ? ` · ${fmtNum(h.posts)} posts` : ""}
                      </p>
                    </div>
                    <Badge className={`text-[10px] gap-1 border-0 text-white ${h.trend === "up" ? "bg-emerald-500" : h.trend === "down" ? "bg-rose-500" : "bg-muted-foreground/50"}`}>
                      <TrendingUp className="h-2.5 w-2.5" />{h.trend === "up" ? "Subindo" : h.trend === "down" ? "Caindo" : "Estável"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* CRIATIVOS */}
            <TabsContent value="creatives" className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                {creatives.map((c) => (
                  <Card key={c.rank} onClick={() => c.url && window.open(c.url, "_blank")}
                    className={`border-border/30 overflow-hidden ${c.url ? "cursor-pointer hover:border-border/60 active:scale-[0.98]" : ""} transition-colors`}>
                    <div className="aspect-[9/12] bg-gradient-to-br from-primary/30 to-accent/10 relative flex items-center justify-center">
                      {c.cover
                        ? <img src={c.cover} alt={c.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        : <Video className="h-7 w-7 text-foreground/40" />}
                      <Badge className="absolute top-2 left-2 text-[10px] bg-background/80 backdrop-blur text-foreground z-10">#{c.rank}</Badge>
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-2 z-10 text-white text-[10px] font-semibold drop-shadow">
                        <span className="flex items-center gap-0.5"><Play className="h-2.5 w-2.5 fill-white" />{fmtNum(c.views)}</span>
                        <span className="flex items-center gap-0.5"><Heart className="h-2.5 w-2.5 fill-white" />{fmtNum(c.likes)}</span>
                      </div>
                    </div>
                    <CardContent className="p-2.5 space-y-0.5">
                      <p className="text-[11px] font-bold leading-tight line-clamp-2">{c.title}</p>
                      {(c.handle || c.author) && <p className="text-[10px] text-muted-foreground/60 truncate">@{c.handle || c.author}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
