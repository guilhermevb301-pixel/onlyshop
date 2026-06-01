import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Search, Package, Percent, DollarSign, Building2, Megaphone, Check, Loader2, ShoppingBag, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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

const CATEGORIES = ["Todos", "Saúde", "Beleza", "Educação", "Tecnologia", "Finanças", "Fitness", "Alimentação", "Moda", "Outro"];

// Catálogo de exemplo quando o real ainda está vazio (mesmo padrão da home/feed).
const DEMO_PRODUCTS_HUB: ProductWithBrand[] = [
  { id: "dp1", name: "Sérum Vitamina C Glow", description: "Clareador facial com vitamina C pura, uniformiza em 2 semanas.", image_url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600", price: 89.9, currency: "BRL", commission_type: "percentage", commission_value: 35, category: "Beleza", active: true, brand_id: "b1", brands: { name: "GlowLab", slug: "glowlab", logo_url: null, verified: true } },
  { id: "dp2", name: "Whey Protein Chocolate 900g", description: "24g de proteína por dose, sabor chocolate intenso.", image_url: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600", price: 129.9, currency: "BRL", commission_type: "percentage", commission_value: 40, category: "Fitness", active: true, brand_id: "b2", brands: { name: "FitPro", slug: "fitpro", logo_url: null, verified: true } },
  { id: "dp3", name: "Mini Liquidificador Portátil USB", description: "Faz seu shake em qualquer lugar, recarregável por USB.", image_url: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=600", price: 79.9, currency: "BRL", commission_type: "percentage", commission_value: 30, category: "Outro", active: true, brand_id: "b3", brands: { name: "HomeEasy", slug: "homeeasy", logo_url: null, verified: false } },
  { id: "dp4", name: "Perfume Amadeirado 100ml", description: "Fixação de 12h, sofisticado e marcante.", image_url: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600", price: 199.9, currency: "BRL", commission_type: "percentage", commission_value: 25, category: "Beleza", active: true, brand_id: "b4", brands: { name: "Essenza", slug: "essenza", logo_url: null, verified: true } },
  { id: "dp5", name: "Colágeno Hidrolisado Verisol", description: "Pele, cabelo e unhas — sabor neutro, 30 doses.", image_url: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600", price: 119.9, currency: "BRL", commission_type: "percentage", commission_value: 45, category: "Saúde", active: true, brand_id: "b5", brands: { name: "VitaLab", slug: "vitalab", logo_url: null, verified: true } },
  { id: "dp6", name: "Tênis Esportivo Leve Pro", description: "Amortecimento e respirabilidade pro dia a dia.", image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600", price: 249.9, currency: "BRL", commission_type: "percentage", commission_value: 20, category: "Moda", active: true, brand_id: "b6", brands: { name: "StepUp", slug: "stepup", logo_url: null, verified: false } },
];

export default function Products() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductWithBrand[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignForProduct[]>([]);
  const [myApplications, setMyApplications] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");

  const isAffiliate = userRole?.role && ["affiliate", "agency", "brand", "admin"].includes(userRole.role);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from("products").select("*, brands(name, slug, logo_url, verified)").eq("active", true).order("created_at", { ascending: false });
      setProducts(data && data.length ? (data as ProductWithBrand[]) : DEMO_PRODUCTS_HUB);

      // Fetch active campaigns
      const { data: campaignsData } = await supabase.from("campaigns").select("id, name, product_id, brand_id, status, bonus_percentage").eq("status", "active");
      setCampaigns((campaignsData as CampaignForProduct[]) || []);

      // Fetch user's existing applications
      if (user) {
        const { data: apps } = await supabase.from("campaign_affiliates").select("campaign_id").eq("user_id", user.id);
        setMyApplications(new Set(apps?.map((a) => a.campaign_id) || []));
      }

      setLoading(false);
    };
    fetch();
  }, [user]);

  const getCampaignForProduct = (product: ProductWithBrand): CampaignForProduct | undefined => {
    return campaigns.find((c) => c.product_id === product.id || (c.product_id === null && c.brand_id === product.brand_id));
  };

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
        setMyApplications((prev) => new Set([...prev, campaignId]));
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    } finally {
      setJoining(null);
    }
  };

  const filtered = products.filter(p => {
    const ms = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
    const mc = category === "Todos" || p.category === category;
    return ms && mc;
  });

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Produtos</h1>
            <p className="text-[11px] text-muted-foreground/50">Os mais vendidos pra anunciar — escolha e crie seu vídeo.</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0 rounded-full">
          <Link to="/affiliate"><TrendingUp className="h-3.5 w-3.5 mr-1.5" /> Relatório de vendas</Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
        <Input placeholder="Buscar produtos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10 text-xs rounded-full bg-muted/20 border-border/15" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-0.5">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)} className={cn("px-3.5 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all shrink-0", category === cat ? "bg-foreground text-background" : "text-muted-foreground/40 hover:text-foreground")}>
            {cat}
          </button>
        ))}
      </div>

      {!loading && <p className="text-[10px] text-muted-foreground/30">{filtered.length} produto{filtered.length !== 1 ? "s" : ""}</p>}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="space-y-2"><Skeleton className="aspect-[4/3] rounded-2xl" /><Skeleton className="h-3 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <Package className="h-8 w-8 mx-auto text-muted-foreground/10 mb-3" />
          <p className="text-sm font-medium">Nenhum produto</p>
          <p className="text-[11px] text-muted-foreground/30 mt-0.5">Tente outra busca</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(product => {
            const campaign = getCampaignForProduct(product);
            const alreadyJoined = campaign ? myApplications.has(campaign.id) : false;

            return (
              <div key={product.id} className="rounded-2xl border border-border/15 overflow-hidden bg-background group">
                <div className="aspect-[4/3] bg-muted/20 relative overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Package className="h-8 w-8 text-muted-foreground/10" /></div>
                  )}
                  {product.commission_value > 0 && (
                    <Badge className="absolute top-2 right-2 bg-success text-white border-0 text-[9px] px-2 py-0.5 rounded-full">
                      {product.commission_type === "percentage" ? <Percent className="h-2.5 w-2.5 mr-0.5" /> : <DollarSign className="h-2.5 w-2.5 mr-0.5" />}
                      {Number(product.commission_value)}{product.commission_type === "percentage" ? "%" : ""}
                    </Badge>
                  )}
                  {campaign && campaign.bonus_percentage && Number(campaign.bonus_percentage) > 0 && (
                    <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground border-0 text-[9px] px-2 py-0.5 rounded-full">
                      <Megaphone className="h-2.5 w-2.5 mr-0.5" /> +{Number(campaign.bonus_percentage)}%
                    </Badge>
                  )}
                </div>
                <div className="p-3 space-y-1.5">
                  <h3 className="font-semibold text-xs line-clamp-1">{product.name}</h3>
                  {product.description && <p className="text-[10px] text-muted-foreground/40 line-clamp-2">{product.description}</p>}
                  <p className="font-bold text-xs">{product.currency === "BRL" ? "R$" : "$"} {Number(product.price).toFixed(2)}</p>
                  {product.brands && (
                    <div className="flex items-center gap-1.5 pt-1 border-t border-border/10">
                      <div className="h-4 w-4 rounded bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                        {product.brands.logo_url ? <img src={product.brands.logo_url} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-2.5 w-2.5 text-muted-foreground/20" />}
                      </div>
                      <span className="text-[9px] text-muted-foreground/30 truncate">{product.brands.name}</span>
                    </div>
                  )}
                  {campaign && (
                    <Button
                      size="sm"
                      className={cn(
                        "w-full h-7 text-[10px] rounded-full mt-1",
                        alreadyJoined
                          ? "bg-success/10 text-success hover:bg-success/20 border-0"
                          : "bg-gradient-primary border-0 text-primary-foreground"
                      )}
                      disabled={alreadyJoined || joining === campaign.id}
                      onClick={() => handleJoinCampaign(campaign.id)}
                    >
                      {joining === campaign.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : alreadyJoined ? (
                        <><Check className="h-3 w-3 mr-1" /> Inscrito</>
                      ) : (
                        <><Megaphone className="h-3 w-3 mr-1" /> Participar</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
