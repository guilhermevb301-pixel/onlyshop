import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Home, Lock, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

// Endereço de entrega do afiliado. CONFIDENCIAL: a RLS de affiliate_shipping só
// libera pra marca que ele JÁ aceitou uma campanha (contratação). Pro afiliado, o
// enquadramento é "pra marca te enviar o produto".
export function ShippingAddressCard({ delay = 0 }: { delay?: number }) {
  const { user } = useAuth();
  const [f, setF] = useState({ cep: "", street: "", number: "", complement: "", district: "", city: "", uf: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase.from("affiliate_shipping" as any).select("*").eq("user_id", user.id).maybeSingle();
        const d = data as any;
        if (d) setF({ cep: d.address_cep ?? "", street: d.address_street ?? "", number: d.address_number ?? "", complement: d.address_complement ?? "", district: d.address_district ?? "", city: d.address_city ?? "", uf: d.address_state ?? "" });
      } catch { /* sem endereço ainda */ }
    })();
  }, [user]);

  const up = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  // Autopreenche via ViaCEP quando o CEP fica completo.
  const onCep = async (v: string) => {
    up("cep", v);
    const digits = v.replace(/\D/g, "");
    if (digits.length !== 8) return;
    try {
      const j = await (await fetch(`https://viacep.com.br/ws/${digits}/json/`)).json();
      if (!j.erro) setF((s) => ({ ...s, street: j.logradouro || s.street, district: j.bairro || s.district, city: j.localidade || s.city, uf: j.uf || s.uf }));
    } catch { /* segue manual */ }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("affiliate_shipping" as any).upsert({
        user_id: user.id,
        address_cep: f.cep.replace(/\D/g, "") || null,
        address_street: f.street.trim() || null,
        address_number: f.number.trim() || null,
        address_complement: f.complement.trim() || null,
        address_district: f.district.trim() || null,
        address_city: f.city.trim() || null,
        address_state: f.uf.trim().toUpperCase() || null,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "user_id" });
      if (error) throw error;
      setSaved(true);
      toast.success("Endereço salvo!", { description: "Só as marcas que você aceitar veem — pra te enviar o produto." });
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error("Não foi possível salvar agora");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-slide-up rounded-[1.5rem] border border-border/40 bg-gradient-to-b from-white/[0.05] to-transparent p-[1px]" style={{ animationDelay: `${delay}ms`, opacity: 0 }}>
      <div className="rounded-[1.4rem] bg-card/80 p-5 ring-1 ring-inset ring-white/[0.04] shadow-[var(--shadow-bezel-inset)]">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20"><Home className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1 pt-0.5">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">Entrega</span>
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Seu endereço</h2>
            <p className="mt-0.5 text-xs text-muted-foreground/70 flex items-center gap-1"><Lock className="h-3 w-3 text-accent" /> Confidencial. Só a marca que você aceitar vê, pra te enviar o produto.</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1 space-y-1"><Label className="text-[11px] text-muted-foreground/70">CEP</Label><Input value={f.cep} onChange={(e) => onCep(e.target.value)} inputMode="numeric" placeholder="00000-000" className="rounded-xl border-border/30" /></div>
            <div className="col-span-2 space-y-1"><Label className="text-[11px] text-muted-foreground/70">Rua</Label><Input value={f.street} onChange={(e) => up("street", e.target.value)} placeholder="Rua / avenida" className="rounded-xl border-border/30" /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1 space-y-1"><Label className="text-[11px] text-muted-foreground/70">Número</Label><Input value={f.number} onChange={(e) => up("number", e.target.value)} placeholder="123" className="rounded-xl border-border/30" /></div>
            <div className="col-span-2 space-y-1"><Label className="text-[11px] text-muted-foreground/70">Complemento</Label><Input value={f.complement} onChange={(e) => up("complement", e.target.value)} placeholder="apto, bloco (opcional)" className="rounded-xl border-border/30" /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1 space-y-1"><Label className="text-[11px] text-muted-foreground/70">Bairro</Label><Input value={f.district} onChange={(e) => up("district", e.target.value)} placeholder="Bairro" className="rounded-xl border-border/30" /></div>
            <div className="col-span-1 space-y-1"><Label className="text-[11px] text-muted-foreground/70">Cidade</Label><Input value={f.city} onChange={(e) => up("city", e.target.value)} placeholder="Cidade" className="rounded-xl border-border/30" /></div>
            <div className="col-span-1 space-y-1"><Label className="text-[11px] text-muted-foreground/70">UF</Label><Input value={f.uf} onChange={(e) => up("uf", e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" maxLength={2} className="rounded-xl border-border/30" /></div>
          </div>
          <Button onClick={save} disabled={saving} className="w-full h-11 rounded-xl gap-2 bg-gradient-primary border-0 text-white active:scale-[.98] transition-transform" aria-busy={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
            {saved ? "Salvo" : "Salvar endereço"}
          </Button>
        </div>
      </div>
    </div>
  );
}
