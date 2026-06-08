import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flame, Loader2, MapPin, TrendingUp, ShoppingBag } from "lucide-react";

interface TrendingProduct {
  product_id: string;
  brand_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  currency: string;
  commission_value: number;
  commission_type: string;
  category: string | null;
  brand_name: string;
  brand_logo: string | null;
  brand_state: string | null;
  recent_sales: number;
  trend_score: number;
}

const CATEGORIES = ["", "Moda", "Beleza", "Fitness", "Tech", "Casa", "Pet", "Gastronomia", "Saúde"];
const STATES = ["", "SP", "RJ", "MG", "RS", "PR", "BA", "SC", "PE", "CE", "GO", "DF"];

export default function Trending() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<TrendingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"1" | "7" | "30">("7");
  const [category, setCategory] = useState("");
  const [state, setState] = useState("");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .rpc("get_trending_products", {
        _period_days: parseInt(period),
        _category: category || null,
        _state: state || null,
        _limit: 30,
      } as any)
      .then(({ data, error }) => {
        if (!error) setProducts((data as any) || []);
        setLoading(false);
      });
  }, [user, period, category, state]);

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground/30" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="max-w-5xl mx-auto py-2 space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
          <Flame className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Em Alta</h1>
          <p className="text-xs text-muted-foreground/60">Produtos com mais vendas e tração agora</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
          <SelectTrigger className="h-9 rounded-full text-xs border-border/30"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">24 horas</SelectItem>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
          <SelectTrigger className="h-9 rounded-full text-xs border-border/30"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {CATEGORIES.filter(Boolean).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={state || "all"} onValueChange={(v) => setState(v === "all" ? "" : v)}>
          <SelectTrigger className="h-9 rounded-full text-xs border-border/30"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos estados</SelectItem>
            {STATES.filter(Boolean).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground/30" /></div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-xs text-muted-foreground/50">Nenhum produto em alta com esses filtros.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((p, i) => (
            <Card
              key={p.product_id}
              onClick={() => navigate("/products")}
              className="border-border/30 overflow-hidden cursor-pointer hover:border-border/60 transition-colors active:scale-[0.98]"
            >
              <div className="aspect-square bg-muted/30 relative">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                    <ShoppingBag className="h-8 w-8" />
                  </div>
                )}
                <Badge className="absolute top-2 left-2 text-[10px] gap-0.5 bg-background/80 backdrop-blur text-foreground">
                  #{i + 1}
                </Badge>
                {p.recent_sales > 0 && (
                  <Badge className="absolute top-2 right-2 text-[10px] gap-1 bg-orange-500 text-white border-0">
                    <TrendingUp className="h-2.5 w-2.5" />{p.recent_sales}
                  </Badge>
                )}
              </div>
              <CardContent className="p-2.5 space-y-1">
                <p className="text-xs font-bold truncate">{p.name}</p>
                <p className="text-[10px] text-muted-foreground/70 truncate flex items-center gap-1">
                  {p.brand_name}
                  {p.brand_state && <><span>·</span><MapPin className="h-2 w-2" />{p.brand_state}</>}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-bold">R$ {Number(p.price).toFixed(0)}</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1">
                    {p.commission_type === "percentage" ? `${p.commission_value}%` : `R$ ${p.commission_value}`}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
