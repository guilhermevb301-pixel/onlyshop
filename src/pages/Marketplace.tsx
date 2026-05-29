import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Search, Star, Users, TrendingUp, Crown, Sparkles, Filter,
  Radio, MessageCircle, Zap, ShoppingBag, ArrowRight, Verified,
  Trophy, Flame, Target, BarChart3
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

// --- Types ---
interface TopAffiliate {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  bio: string;
  followers: number;
  engagement: number;
  categories: string[];
  priceRange: string;
  rating: number;
  isVerified: boolean;
  livesCount: number;
  salesCount: number;
  conversionRate: number;
  totalRevenue: number;
  level: string;
}

// --- Mock Data (afiliados reais) ---
const MOCK_AFFILIATES: TopAffiliate[] = [
  {
    id: "1", name: "Camila Beauty", username: "@camilabeauty", bio: "Especialista em skincare e maquiagem. +5 anos criando conteúdo e vendendo ao vivo.",
    followers: 458000, engagement: 4.8, categories: ["Beleza", "Skincare"],
    priceRange: "R$ 2K-5K", rating: 4.9, isVerified: true,
    livesCount: 87, salesCount: 12400, conversionRate: 8.2, totalRevenue: 485000, level: "Diamante",
  },
  {
    id: "2", name: "Tech Rafael", username: "@techrafael", bio: "Reviews honestos de tecnologia e gadgets. Foco em live commerce.",
    followers: 312000, engagement: 5.1, categories: ["Tech", "Gadgets"],
    priceRange: "R$ 1.5K-4K", rating: 4.7, isVerified: true,
    livesCount: 54, salesCount: 8900, conversionRate: 6.5, totalRevenue: 312000, level: "Ouro",
  },
  {
    id: "3", name: "Fitness Maria", username: "@fitnessmaria", bio: "Personal trainer e nutricionista. Resultados reais, vendas reais.",
    followers: 890000, engagement: 3.9, categories: ["Saúde", "Fitness"],
    priceRange: "R$ 5K-15K", rating: 4.8, isVerified: true,
    livesCount: 42, salesCount: 23000, conversionRate: 5.8, totalRevenue: 890000, level: "Diamante",
  },
  {
    id: "4", name: "Chef João", username: "@chefjao", bio: "Receitas fáceis e deliciosas. Foco em utensílios de cozinha e lives de vendas.",
    followers: 245000, engagement: 6.3, categories: ["Gastronomia", "Casa"],
    priceRange: "R$ 1K-3K", rating: 4.6, isVerified: true,
    livesCount: 65, salesCount: 7800, conversionRate: 7.1, totalRevenue: 198000, level: "Ouro",
  },
  {
    id: "5", name: "Ana Moda", username: "@anamoda", bio: "Estilista e consultora de moda. Criadora de looks acessíveis e vendáveis.",
    followers: 567000, engagement: 5.5, categories: ["Moda", "Lifestyle"],
    priceRange: "R$ 3K-8K", rating: 4.8, isVerified: true,
    livesCount: 96, salesCount: 18200, conversionRate: 9.4, totalRevenue: 720000, level: "Diamante",
  },
  {
    id: "6", name: "Lucas Tech", username: "@lucastech", bio: "Especialista em smart home e eletrônicos. Reviews e lives de unboxing.",
    followers: 195000, engagement: 4.2, categories: ["Tech", "Casa"],
    priceRange: "R$ 800-2K", rating: 4.4, isVerified: false,
    livesCount: 38, salesCount: 4500, conversionRate: 5.1, totalRevenue: 95000, level: "Prata",
  },
];

const CATEGORIES = ["Todos", "Beleza", "Tech", "Moda", "Saúde", "Gastronomia", "Casa", "Fitness"];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function formatRevenue(n: number): string {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}K`;
  return `R$ ${n}`;
}

const LEVEL_COLORS: Record<string, string> = {
  Diamante: "text-primary",
  Ouro: "text-yellow-500",
  Prata: "text-muted-foreground",
};

// --- Affiliate Card ---
function AffiliateCard({ affiliate, onInvite }: { affiliate: TopAffiliate; onInvite: () => void }) {
  return (
    <Card className="overflow-hidden border-0 bg-card/50 ring-1 ring-border/20 hover:ring-primary/30 transition-all">
      <CardContent className="p-0">
        {/* Header gradient */}
        <div className="h-16 relative bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5">
          {affiliate.isVerified && (
            <Badge className="absolute top-2 right-2 bg-primary/80 text-white border-0 text-[8px] gap-0.5">
              <Verified className="h-2.5 w-2.5" /> Verificado
            </Badge>
          )}
          <Badge className={cn(
            "absolute top-2 left-2 border-0 text-[8px] gap-0.5 bg-background/80",
            LEVEL_COLORS[affiliate.level] || "text-muted-foreground"
          )}>
            <Trophy className="h-2.5 w-2.5" /> {affiliate.level}
          </Badge>
        </div>

        {/* Avatar */}
        <div className="px-3 -mt-8 relative z-10">
          <Avatar className="h-14 w-14 ring-3 ring-background">
            <AvatarImage src={affiliate.avatar} />
            <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
              {affiliate.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Info */}
        <div className="px-3 pt-2 pb-3">
          <div className="flex items-center gap-1 mb-0.5">
            <h3 className="text-sm font-bold truncate">{affiliate.name}</h3>
            {affiliate.rating >= 4.8 && <Crown className="h-3 w-3 text-yellow-500 shrink-0" />}
          </div>
          <p className="text-[10px] text-muted-foreground">{affiliate.username}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1 line-clamp-2">{affiliate.bio}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mt-3 mb-3">
            <div className="text-center">
              <p className="text-xs font-black">{formatNumber(affiliate.followers)}</p>
              <p className="text-[8px] text-muted-foreground">Seguidores</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-black text-primary">{affiliate.conversionRate}%</p>
              <p className="text-[8px] text-muted-foreground">Conversão</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-black text-accent">{formatRevenue(affiliate.totalRevenue)}</p>
              <p className="text-[8px] text-muted-foreground">Faturado</p>
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-1 mb-3">
            {affiliate.categories.map((cat) => (
              <Badge key={cat} variant="outline" className="text-[8px] px-1.5 py-0 border-border/30">{cat}</Badge>
            ))}
          </div>

          {/* Bottom stats */}
          <div className="flex items-center justify-between text-[9px] text-muted-foreground/50 mb-3">
            <span className="flex items-center gap-0.5"><Radio className="h-2.5 w-2.5" /> {affiliate.livesCount} lives</span>
            <span className="flex items-center gap-0.5"><ShoppingBag className="h-2.5 w-2.5" /> {formatNumber(affiliate.salesCount)} vendas</span>
            <span className="flex items-center gap-0.5"><Star className="h-2.5 w-2.5 text-yellow-500" /> {affiliate.rating}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-8 text-[10px] rounded-xl bg-foreground text-background" onClick={onInvite}>
              Convidar
            </Button>
            <Button size="sm" variant="outline" className="h-8 px-3 text-[10px] rounded-xl border-border/30" asChild>
              <Link to="/chat">
                <MessageCircle className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Page ---
export default function Marketplace() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [sortBy, setSortBy] = useState<"conversion" | "sales" | "revenue">("conversion");

  const filtered = MOCK_AFFILIATES
    .filter((a) => {
      if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.username.toLowerCase().includes(search.toLowerCase())) return false;
      if (category !== "Todos" && !a.categories.includes(category)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "conversion") return b.conversionRate - a.conversionRate;
      if (sortBy === "sales") return b.salesCount - a.salesCount;
      return b.totalRevenue - a.totalRevenue;
    });

  const topCreators = [...MOCK_AFFILIATES].sort((a, b) => b.conversionRate - a.conversionRate).slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-b-3xl mb-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-accent/10" />
        <div className="relative px-4 pt-4 pb-5">
          <h1 className="text-xl font-black flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Vitrine de Afiliados
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Os melhores criadores com resultados verificados</p>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar afiliados..."
              className="pl-9 h-10 rounded-xl bg-muted/30 border-border/20 text-sm"
            />
          </div>

          {/* Summary stats */}
          <div className="flex gap-3 mt-3">
            <div className="flex items-center gap-1.5 bg-primary/10 rounded-full px-3 py-1">
              <Users className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-bold text-primary">{MOCK_AFFILIATES.length} Afiliados Top</span>
            </div>
            <div className="flex items-center gap-1.5 bg-accent/10 rounded-full px-3 py-1">
              <Flame className="h-3 w-3 text-accent" />
              <span className="text-[10px] font-bold text-accent">Métricas Reais</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sort */}
      <div className="flex gap-2 px-4 mb-3">
        {([
          ["conversion", "🎯 Conversão"],
          ["sales", "🛒 Vendas"],
          ["revenue", "💰 Faturamento"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all",
              sortBy === key ? "bg-foreground text-background" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Categories */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "px-3 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all shrink-0",
              category === cat ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground/60 hover:bg-muted/40"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Top Performers */}
      <div className="px-4 mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp className="h-3.5 w-3.5 text-accent" />
          <span className="text-xs font-bold">Top Conversão</span>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {topCreators.map((a, i) => (
            <div key={a.id} className="flex items-center gap-2 bg-muted/20 rounded-2xl px-3 py-2 shrink-0 min-w-[180px]">
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                    {a.name[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -top-1 -left-1 h-4 w-4 rounded-full bg-accent text-[8px] font-black text-white flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <div>
                <p className="text-[11px] font-bold truncate">{a.name}</p>
                <p className="text-[9px] text-accent font-bold">{a.conversionRate}% conversão</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold">{filtered.length} afiliados encontrados</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((a) => (
            <AffiliateCard
              key={a.id}
              affiliate={a}
              onInvite={() => toast({ title: "Convite enviado! 🎉", description: `${a.name} receberá seu convite.` })}
            />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum afiliado encontrado</p>
          </div>
        )}
      </div>

      {/* CTA — Become an affiliate */}
      <div className="px-4 mt-6">
        <Card className="border-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 ring-1 ring-primary/20">
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h3 className="text-sm font-bold mb-1">Quer aparecer aqui?</h3>
            <p className="text-[10px] text-muted-foreground mb-3">Faça upgrade para Partner e comece a vender. Seus resultados te colocam no ranking.</p>
            <Button size="sm" className="rounded-full text-[11px]" asChild>
              <Link to="/affiliate">
                <Zap className="h-3 w-3 mr-1" />
                Ver Planos de Afiliado
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
