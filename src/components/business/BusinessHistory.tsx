import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface HistoryItem {
  id: string; title: string; brand_name: string; creator_name: string; creator_id: string; brand_user_id: string;
  other_user_id: string; closed_at: string; delivery_hours: number | null; reward_type: string;
  ratings: Array<{ stars: number; comment: string | null; rater_user_id: string; rated_user_id: string }>;
}
export function BusinessHistory({ userId }: { userId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [error, setError] = useState("");
  const [ratingFor, setRatingFor] = useState<HistoryItem | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async (offset = 0) => {
    setLoading(offset === 0); setLoadingMore(offset > 0); setError("");
    const { data, error: failure } = await supabase.rpc("get_business_history" as any, { _user_id: userId, _offset: offset });
    if (failure) { if (offset) toast.error("Não foi possível carregar mais parcerias."); else setError("Não foi possível carregar o histórico."); }
    else {
      const rows = (data as unknown as HistoryItem[]) ?? [];
      setItems(prev => offset ? [...prev,...rows.filter(row => !prev.some(item => item.id === row.id))] : rows);
      setHasMore(rows.length === 50); setNextOffset(offset + rows.length);
    }
    setLoading(false); setLoadingMore(false);
  }, [userId]);
  useEffect(() => { void load(); }, [load]);
  const rate = async () => {
    if (!user || !ratingFor) return;
    setSaving(true);
    const { error: failure } = await supabase.from("ratings" as any).insert({ application_id: ratingFor.id, rater_user_id: user.id, rated_user_id: ratingFor.other_user_id, stars, comment: comment.trim() || null, criteria: {} });
    setSaving(false);
    if (failure && failure.code !== "23505") { toast.error("Não foi possível salvar a avaliação."); return; }
    setRatingFor(null); await load(); toast.success("Avaliação registrada");
  };
  return <section className="space-y-4">
    <div><h2 className="text-lg font-bold">Histórico de negócios</h2><p className="text-sm text-muted-foreground">Campanhas concluídas e avaliações verificadas. As conversas continuam privadas.</p></div>
    {loading ? <Loader2 aria-label="Carregando histórico" className="h-5 w-5 animate-spin" /> : error ? <div role="alert">{error} <Button variant="outline" onClick={()=>load()}>Tentar novamente</Button></div> : !items.length ? <p className="py-8 text-sm text-muted-foreground">As campanhas concluídas aparecerão aqui, com as avaliações de cada parceria.</p> : items.map(item => <article key={item.id} className="rounded-xl border border-border p-4 space-y-3">
      <div><h3 className="font-semibold">{item.title}</h3><p className="text-sm text-muted-foreground">{item.brand_name} com {item.creator_name}{item.reward_type === "permuta" ? " · Permuta" : ""}</p></div>
      <p className="text-xs text-muted-foreground">{item.delivery_hours == null ? "Atualização do registro" : "Conclusão"}: {new Date(item.closed_at).toLocaleDateString("pt-BR")} · {item.delivery_hours == null ? "Prazo de entrega não registrado nesta campanha" : `Entrega em ${item.delivery_hours} h após o aceite`}</p>
      {item.ratings.length ? item.ratings.map(r => <div key={r.rater_user_id} className="text-sm border-l-2 border-primary pl-3"><p className="flex items-center gap-1"><Star className="h-4 w-4 text-amber-400" /> {r.stars}/5 · {r.rated_user_id === item.creator_id ? "Avaliação do creator" : "Avaliação da marca"}</p>{r.comment && <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">{r.comment}</p>}</div>) : <p className="text-xs text-muted-foreground">Ainda sem avaliações.</p>}
      {user?.id === userId && !item.ratings.some(r => r.rater_user_id === user.id) && <Button variant="outline" onClick={() => { setRatingFor(item); setStars(5); setComment(""); }}>Avaliar parceria</Button>}
    </article>)}
    {hasMore && <Button variant="outline" disabled={loadingMore} onClick={()=>load(nextOffset)}>{loadingMore ? "Carregando…" : "Carregar parcerias anteriores"}</Button>}
    <Dialog open={!!ratingFor} onOpenChange={open => { if (!open && !saving) setRatingFor(null); }}><DialogContent><DialogHeader><DialogTitle>Avaliar {ratingFor?.title}</DialogTitle><DialogDescription>Sua nota e seu comentário serão públicos no histórico da parceria.</DialogDescription></DialogHeader>
      <div className="flex gap-2" role="group" aria-label="Nota da parceria">{[1,2,3,4,5].map(n => <button type="button" key={n} aria-label={`${n} estrela${n > 1 ? "s" : ""}`} aria-pressed={stars === n} onClick={() => setStars(n)} className={`h-11 w-11 rounded-lg border ${n <= stars ? "text-amber-400 bg-amber-400/10" : "text-muted-foreground"}`}><Star className="h-5 w-5 mx-auto" fill={n <= stars ? "currentColor" : "none"} /></button>)}</div>
      <textarea className="w-full rounded-lg border border-border bg-background p-3 text-sm" aria-label="Comentário sobre a parceria" placeholder="Como foi trabalhar juntos? Seu comentário será público." maxLength={2000} value={comment} onChange={e => setComment(e.target.value)} />
      <div className="flex gap-2"><Button onClick={rate} disabled={saving}>{saving ? "Salvando…" : "Publicar avaliação"}</Button><Button variant="ghost" onClick={() => setRatingFor(null)} disabled={saving}>Cancelar</Button></div>
    </DialogContent></Dialog>
  </section>;
}
