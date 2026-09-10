import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Download, RefreshCw } from "lucide-react";
import { leadsCsv, type WaitlistLead } from "@/lib/waitlist";

const PAGE_SIZE = 25;
export default function WaitlistLeads() {
  const [leads, setLeads] = useState<WaitlistLead[]>([]);
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState("all");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  const query = () => {
    let q = supabase.from("waitlist_leads").select("id,position,name,email,whatsapp,profile,created_at", { count: "exact" });
    if (profile !== "all") q = q.eq("profile", profile);
    // Remove PostgREST filter operators from public search text.
    const term = search.trim().replace(/[,*%()\\]/g, " ").slice(0, 120);
    if (term) q = q.or(`name.ilike.%${term}%,email.ilike.%${term}%,whatsapp.ilike.%${term}%`);
    return q.order("created_at", { ascending: false }).order("id", { ascending: false });
  };
  useEffect(() => {
    let live = true;
    setBusy(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const { data, error: failure, count } = await query().range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (failure) throw failure;
        if (live) { setLeads(data as WaitlistLead[]); setTotal(count || 0); }
      } catch { if (live) { setLeads([]); setError("Não foi possível carregar os leads. Tente atualizar."); } }
      finally { if (live) setBusy(false); }
    }, 250);
    return () => { live = false; clearTimeout(timer); };
    // query uses precisely these filter dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, profile, page, refresh]);

  async function exportCsv() {
    setExporting(true); setError("");
    try {
      const rows: WaitlistLead[] = [];
      for (let start = 0; ; start += 500) {
        const { data, error: failure } = await query().range(start, start + 499);
        if (failure) throw failure;
        rows.push(...data as WaitlistLead[]);
        if (data.length < 500) break;
      }
      const url = URL.createObjectURL(new Blob([leadsCsv(rows)], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a"); a.href = url; a.download = "onlyshop-lista-de-espera.csv"; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError("Não foi possível exportar. Tente novamente."); }
    finally { setExporting(false); }
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap gap-3 items-center justify-between"><div><h2 className="text-xl font-bold">Leads da lista de espera</h2><p className="text-sm text-muted-foreground">{total} cadastro(s) nos filtros atuais</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => setRefresh(value => value + 1)} aria-label="Atualizar leads"><RefreshCw className="h-4 w-4" /></Button><Button onClick={exportCsv} disabled={exporting || busy || !!error}>{exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}Exportar CSV</Button></div></div>
    <div className="flex flex-wrap gap-3"><Input aria-label="Buscar leads" placeholder="Buscar nome, e-mail ou WhatsApp" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="flex-1 min-w-48" /><select aria-label="Filtrar perfil" className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={profile} onChange={e => { setProfile(e.target.value); setPage(0); }}><option value="all">Todos os perfis</option><option value="creator">Creator</option><option value="company">Empresa</option></select></div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {busy ? <div role="status" className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /><span className="sr-only">Carregando leads</span></div> : !error && (leads.length ? <div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm"><thead className="bg-muted/40"><tr>{["Ordem", "Nome", "E-mail", "WhatsApp", "Perfil", "Cadastro"].map(label => <th key={label} className="p-3 text-left whitespace-nowrap">{label}</th>)}</tr></thead><tbody>{leads.map(lead => <tr key={lead.id} className="border-t"><td className="p-3">#{lead.position}</td><td className="p-3 min-w-40">{lead.name}</td><td className="p-3"><a className="underline" href={`mailto:${lead.email}`}>{lead.email}</a></td><td className="p-3 whitespace-nowrap"><a className="text-accent underline" href={`https://wa.me/${lead.whatsapp}`} target="_blank" rel="noopener noreferrer">+{lead.whatsapp}</a></td><td className="p-3">{lead.profile === "creator" ? "Creator" : "Empresa"}</td><td className="p-3 whitespace-nowrap">{new Date(lead.created_at).toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div> : <p className="text-center text-muted-foreground py-12">Nenhum lead encontrado.</p>)}
    <div className="flex items-center justify-between text-sm"><Button variant="outline" disabled={page === 0 || busy} onClick={() => setPage(p => p - 1)}>Anterior</Button><span>Página {page + 1} de {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span><Button variant="outline" disabled={busy || (page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}>Próxima</Button></div>
  </div>;
}
