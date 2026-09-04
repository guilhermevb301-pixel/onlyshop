import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Globe, Sparkles, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { Brand } from "@/hooks/useBrand";
import { normalizeBrandWebsiteDomain, validateBrandWebsiteDomain } from "@/lib/urlValidation";

interface Props {
  onRegister: (data: { name: string; slug: string; description?: string; website?: string }) => Promise<Brand | null>;
  onDone?: () => void; // recarrega a área do lojista após cadastrar
}

export function BrandRegistration({ onRegister, onDone }: Props) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(false);
  const [geoOk, setGeoOk] = useState(false);
  const { loading: geoLoading, requestBrowserLocation, reverseGeocode, forwardGeocode } = useGeolocation();

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
  };

  const handleWebsiteChange = (value: string) => {
    setWebsite(normalizeBrandWebsiteDomain(value));
  };

  // Tenta o GPS e preenche cidade/estado. Sem isso a marca não entra no mapa.
  const detectLocation = async () => {
    const geo = await requestBrowserLocation();
    if (!geo) {
      toast.error("Não foi possível detectar", { description: "Preencha cidade e estado manualmente." });
      return;
    }
    const addr = await reverseGeocode(geo.latitude, geo.longitude);
    if (addr.city) setCity(addr.city);
    if (addr.state) setState(addr.state);
    setGeoOk(true);
    toast.success("Localização capturada!", { description: `${addr.city ?? ""}${addr.state ? `, ${addr.state}` : ""}` });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    if (!city.trim()) {
      toast.error("Falta a localização", { description: "Capture sua localização ou preencha a cidade — sem isso sua loja não aparece no mapa." });
      return;
    }
    const cleanWebsite = normalizeBrandWebsiteDomain(website);
    const websiteValidation = validateBrandWebsiteDomain(cleanWebsite);
    if (!websiteValidation.isValid) {
      toast.error("Website inválido", { description: websiteValidation.error });
      return;
    }
    setLoading(true);
    try {
      const brand = await onRegister({
        name,
        slug,
        description: description || undefined,
        website: cleanWebsite || undefined,
      });

      // Geocoda cidade/estado -> lat/lon e salva no registro da marca (entra no mapa).
      if (brand) {
        let geo = await forwardGeocode(city.trim(), state.trim() || undefined);
        // Fallback demo: se o Nominatim falhar/rate-limit, usa o centro de Sorocaba/SP
        // (DEFAULT_CENTER em campaigns.ts) — a loja nunca fica sem coordenadas no mapa.
        if (!geo?.latitude || !geo?.longitude) {
          geo = { latitude: -23.5015, longitude: -47.4526 };
          console.warn("forwardGeocode falhou — usando coordenadas de fallback (Sorocaba/SP).");
        }
        await persistBrandLocation(brand.id, {
          latitude: geo.latitude,
          longitude: geo.longitude,
          city: city.trim(),
          state: state.trim() || null,
        });
      }

      toast.success("Loja cadastrada!", { description: "Agora crie sua primeira campanha." });
      onDone?.();
    } catch (err: any) {
      toast.error("Erro", { description: err?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg border-border/30 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-display">Cadastrar sua loja</CardTitle>
          <CardDescription>Crie campanhas e receba influencers locais gravando vídeos do seu produto</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Nome da loja *</Label>
              <Input placeholder="Ex: Boutique Bella" value={name} onChange={(e) => handleNameChange(e.target.value)} className="rounded-xl border-border/20" required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Slug (URL) *</Label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-[11px] shrink-0">onlyshop.app/loja/</span>
                <Input placeholder="boutique-bella" value={slug} onChange={(e) => setSlug(e.target.value)} required className="flex-1 rounded-xl border-border/20" />
              </div>
            </div>

            {/* Localização — obrigatória pra entrar no mapa */}
            <div className="rounded-2xl border border-border/20 bg-muted/10 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-accent" /> Localização da loja *</Label>
                <Button
                  type="button" variant="outline" size="sm"
                  className={cn("rounded-full h-9 px-3 text-[11px] gap-1.5 active:scale-[.97] transition-transform", geoOk && "border-success/40 text-success")}
                  onClick={detectLocation}
                  disabled={geoLoading}
                >
                  {geoLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : geoOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                  {geoOk ? "Capturada" : "Usar meu GPS"}
                </Button>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} className="rounded-xl border-border/20" />
                <Input placeholder="UF" maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase())} className="rounded-xl border-border/20 w-16 uppercase" />
              </div>
              <p className="text-[10px] text-muted-foreground/40">Sem localização sua loja não aparece pros influencers perto de você.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Descrição</Label>
              <Textarea placeholder="Fale sobre sua loja..." value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="rounded-xl border-border/20" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Website</Label>
              <Input
                placeholder="empresa.com.br"
                value={website}
                onChange={(e) => handleWebsiteChange(e.target.value)}
                onBlur={(e) => handleWebsiteChange(e.target.value)}
                type="text"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="rounded-xl border-border/20"
              />
            </div>

            <Button type="submit" className="w-full rounded-full bg-gradient-primary border-0 text-primary-foreground h-11 gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Cadastrando..." : "Cadastrar loja"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Salva lat/lon/cidade/estado da marca. Demo: localStorage; real: Supabase.
async function persistBrandLocation(
  brandId: string,
  loc: { latitude: number | null; longitude: number | null; city: string; state: string | null }
) {
  const { demo } = await import("@/lib/campaigns");
  if (demo.isOn()) {
    try {
      const raw = localStorage.getItem("onlyshop_demo_brand");
      if (raw) {
        const b = JSON.parse(raw);
        localStorage.setItem("onlyshop_demo_brand", JSON.stringify({ ...b, ...loc }));
      }
    } catch { /* noop */ }
    return;
  }
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.from("brands").update(loc as any).eq("id", brandId);
  } catch (e) {
    console.error("persistBrandLocation:", e);
  }
}
