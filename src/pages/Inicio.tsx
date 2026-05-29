import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PERSONAS, type Persona } from "@/lib/personas";
import { listInfluencers } from "@/lib/influencers";
import { CreateInfluencerDialog } from "@/components/studio/CreateInfluencerDialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight, Wand2, Package, Percent, DollarSign, BadgeDollarSign,
  Building2, Plus, Users,
} from "lucide-react";

type Product = {
  id: string; name: string; description: string | null; image_url: string | null;
  price: number; currency?: string; commission_type?: string; commission_value?: number;
  brands?: { name: string } | null;
};

const DEMO_PRODUCTS: Product[] = [
  { id: "demo-1", name: "Sérum Vitamina C Glow", description: "Clareador facial com vitamina C pura.", image_url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600", price: 89.9, currency: "BRL", commission_type: "percentage", commission_value: 35, brands: { name: "GlowLab" } },
  { id: "demo-2", name: "Whey Protein Chocolate 900g", description: "24g de proteína por dose, sabor intenso.", image_url: "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600", price: 129.9, currency: "BRL", commission_type: "percentage", commission_value: 40, brands: { name: "FitPro" } },
  { id: "demo-3", name: "Mini Liquidificador Portátil USB", description: "Faz seu shake em qualquer lugar.", image_url: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=600", price: 79.9, currency: "BRL", commission_type: "percentage", commission_value: 30, brands: { name: "HomeEasy" } },
  { id: "demo-4", name: "Perfume Amadeirado 100ml", description: "Fixação de 12h, sofisticado e marcante.", image_url: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=600", price: 199.9, currency: "BRL", commission_type: "percentage", commission_value: 25, brands: { name: "Essenza" } },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Inicio() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [customPersonas, setCustomPersonas] = useState<Persona[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const firstName = (profile?.display_name || user?.email?.split("@")[0] || "criador").split(" ")[0];

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, description, image_url, price, currency, commission_type, commission_value, brands(name)")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(8);
      setProducts(data && data.length ? (data as any) : DEMO_PRODUCTS);
      setLoadingProducts(false);
    })();
  }, []);

  useEffect(() => {
    if (!user) return;
    listInfluencers(user.id).then(setCustomPersonas).catch(() => {});
  }, [user]);

  const personas = [...customPersonas, ...PERSONAS];
  const goProduct = (p: Product) => navigate("/studio", { state: { product: p } });
  const goPersona = (p: Persona) => navigate("/studio", { state: { persona: p } });

  return (
    <div className="space-y-12 lg:space-y-16">
      {/* ===== Seção 0 — Hero da pergunta ===== */}
      <section className="pt-2 lg:pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <span className="inline-flex items-center rounded-full border border-white/[0.08] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-5">
          {greeting()}, {firstName}
        </span>
        <h1 className="font-display text-4xl lg:text-6xl font-bold tracking-tight leading-[0.98] max-w-3xl">
          Qual produto você quer <span className="text-gradient-primary">anunciar hoje?</span>
        </h1>
        <p className="text-muted-foreground text-base lg:text-lg max-w-xl mt-5">
          Escolha um produto, escolha um influencer de IA, e tenha um vídeo de venda pronto pra postar. Você não precisa aparecer.
        </p>
        <Link
          to="/studio"
          className="group mt-7 inline-flex items-center gap-3 rounded-full pl-7 pr-2 py-3.5 bg-gradient-primary text-white font-semibold shadow-[var(--shadow-glow-cta)] transition-all duration-500 ease-[var(--ease-fluid)] active:scale-[0.98] hover:shadow-[0_12px_38px_-10px_hsl(346_100%_58%/0.6)]"
        >
          Criar meu vídeo agora
          <span className="grid place-items-center h-9 w-9 rounded-full bg-black/20 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-105">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </Link>
      </section>

      {/* ===== Seção 1 — Stats (cyan = dinheiro) ===== */}
      <section className="grid grid-cols-3 gap-3 lg:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
        <StatCard label="Produtos pra anunciar" value={loadingProducts ? "—" : String(products.length)} icon={Package} />
        <StatCard label="Influencers prontos" value={String(personas.length)} icon={Users} />
        <StatCard label="Ganhos este mês" value="Comece a faturar" icon={BadgeDollarSign} accent compact />
      </section>

      {/* ===== Seção 2 — Produtos ===== */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base lg:text-lg font-semibold">Produtos pra anunciar</h2>
          <Link to="/products" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Ver todos →</Link>
        </div>
        {loadingProducts ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2"><Skeleton className="aspect-[4/3] rounded-[1.5rem]" /><Skeleton className="h-3 w-3/4" /></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            {products.map((p) => <ProductCard key={p.id} product={p} onClick={() => goProduct(p)} />)}
          </div>
        )}
      </section>

      {/* ===== Seção 3 — Influencers ===== */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base lg:text-lg font-semibold">Seus apresentadores</h2>
          <Link to="/meus-influencers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Gerenciar →</Link>
        </div>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar snap-x pb-1">
          {/* Criar influencer */}
          <button
            onClick={() => setDialogOpen(true)}
            className="shrink-0 w-[150px] snap-start aspect-[3/4] rounded-[1.5rem] border border-dashed border-white/[0.12] bg-white/[0.02] flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors"
          >
            <div className="h-11 w-11 rounded-2xl bg-gradient-primary flex items-center justify-center">
              <Plus className="h-5 w-5 text-white" />
            </div>
            <p className="text-xs font-medium">Criar influencer</p>
            <p className="text-[10px] text-muted-foreground px-3 text-center">Sua própria foto vira IA</p>
          </button>

          {personas.map((p) => (
            <button
              key={p.id}
              onClick={() => goPersona(p)}
              className="group shrink-0 w-[150px] snap-start text-left"
            >
              <div className="aspect-[3/4] rounded-[1.5rem] overflow-hidden bg-muted relative">
                <img src={p.avatar} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {p.custom && (
                  <Badge variant="secondary" className="absolute top-2 left-2 text-[9px] bg-primary text-primary-foreground border-0">seu</Badge>
                )}
                {/* veil hover */}
                <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/85 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[var(--ease-fluid)]">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white">
                    <Wand2 className="h-3 w-3" /> Usar este →
                  </span>
                </div>
              </div>
              <p className="text-xs font-semibold mt-2 leading-tight">{p.name}</p>
              <p className="text-[10px] text-muted-foreground">{p.niche}</p>
            </button>
          ))}
        </div>
      </section>

      {user && (
        <CreateInfluencerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          userId={user.id}
          onCreated={(p) => setCustomPersonas((prev) => [p, ...prev])}
        />
      )}
    </div>
  );
}

// ---- Card de stat (double-bezel) -------------------------------------------
function StatCard({ label, value, icon: Icon, accent, compact }: {
  label: string; value: string; icon: typeof Package; accent?: boolean; compact?: boolean;
}) {
  return (
    <div className="bg-white/[0.03] ring-1 ring-white/[0.06] p-1.5 rounded-[1.5rem]">
      <div className="rounded-[calc(1.5rem-0.375rem)] bg-card shadow-[var(--shadow-bezel-inset)] p-4 lg:p-5 h-full">
        <Icon className={cn("h-4 w-4 mb-2", accent ? "text-accent" : "text-muted-foreground/50")} strokeWidth={1.75} />
        <p className={cn(
          "font-display font-bold tabular-nums leading-none",
          compact ? "text-base lg:text-lg" : "text-2xl lg:text-3xl",
          accent && "text-accent"
        )}>
          {value}
        </p>
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 mt-2">{label}</p>
      </div>
    </div>
  );
}

// ---- Card de produto (double-bezel, hover "Criar vídeo deste") --------------
function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const cur = product.currency === "USD" ? "$" : "R$";
  return (
    <button onClick={onClick} className="group text-left bg-white/[0.03] ring-1 ring-white/[0.06] p-1.5 rounded-[1.5rem] transition-all duration-500 ease-[var(--ease-fluid)] hover:ring-primary/30 hover:-translate-y-1">
      <div className="rounded-[calc(1.5rem-0.375rem)] bg-card overflow-hidden">
        <div className="aspect-[4/3] bg-muted relative overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Package className="h-8 w-8 text-muted-foreground/20" /></div>
          )}
          {!!product.commission_value && product.commission_value > 0 && (
            <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground border-0 text-[9px] px-2 py-0.5 rounded-full">
              {product.commission_type === "percentage" ? <Percent className="h-2.5 w-2.5 mr-0.5" /> : <DollarSign className="h-2.5 w-2.5 mr-0.5" />}
              {Number(product.commission_value)}{product.commission_type === "percentage" ? "%" : ""}
            </Badge>
          )}
          {/* veil hover "Criar vídeo deste" */}
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[var(--ease-fluid)]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-3 py-1.5 text-[11px] font-semibold text-white shadow-[var(--shadow-glow-cta)]">
              <Wand2 className="h-3 w-3" /> Criar vídeo deste →
            </span>
          </div>
        </div>
        <div className="p-3 space-y-1">
          <h3 className="font-semibold text-sm line-clamp-1">{product.name}</h3>
          <p className="font-bold text-sm">{cur} {Number(product.price).toFixed(2)}</p>
          {product.brands && (
            <div className="flex items-center gap-1.5 pt-1">
              <div className="h-4 w-4 rounded bg-muted flex items-center justify-center shrink-0">
                <Building2 className="h-2.5 w-2.5 text-muted-foreground/40" />
              </div>
              <span className="text-[10px] text-muted-foreground/60 truncate">{product.brands.name}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
