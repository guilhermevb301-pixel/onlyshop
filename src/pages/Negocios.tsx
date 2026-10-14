import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/client";
import { BusinessHistory } from "@/components/business/BusinessHistory";
import { CampaignSheet } from "@/components/map/CampaignSheet";
import type { CampaignNear } from "@/lib/campaigns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Heart, MessageCircle, Loader2, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Post { id: string; user_id: string; content: string; media_path: string | null; campaign_id: string | null; created_at: string; image?: string; profile?: { username: string; display_name: string; avatar_url: string }; likes: number; liked: boolean }
interface Person { user_id: string; username: string; display_name: string; avatar_url: string; following: boolean; mutual: boolean }
export default function Negocios() {
  const { user, loading } = useAuth();
  if (loading) return <Loader2 className="h-5 w-5 animate-spin" />;
  if (!user) return <Navigate to="/auth" replace />;
  return <BusinessFeed key={user.id} />;
}
function BusinessFeed() {
  const { user, loading: authLoading } = useAuth();
  const { startConversation } = useChat();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState("feed");
  const [posts, setPosts] = useState<Post[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([]);
  const [selected, setSelected] = useState<CampaignNear | null>(null);
  const [loading, setLoading] = useState(false);
  const [more, setMore] = useState(false);
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [campaignId, setCampaignId] = useState("");
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const loadFeed = useCallback(async (next = 0) => {
    if (!user) return;
    setLoading(true); setError("");
    try {
      const { data, error: failure } = await supabase.from("business_posts" as any).select("*").order("created_at", { ascending: false }).order("id", { ascending: false }).range(next * 20, next * 20 + 19);
      if (failure) throw failure;
      const rows = (data ?? []) as unknown as Post[];
      const ids = rows.map(r => r.id), userIds = [...new Set(rows.map(r => r.user_id))];
      const [profileResult, likesResult] = await Promise.all([
        userIds.length ? supabase.from("profiles").select("user_id,username,display_name,avatar_url").in("user_id", userIds) : Promise.resolve({ data: [], error: null }),
        ids.length ? supabase.from("business_likes" as any).select("post_id,user_id").in("post_id", ids) : Promise.resolve({ data: [], error: null }),
      ]);
      if (profileResult.error || likesResult.error) throw profileResult.error || likesResult.error;
      const paths = rows.map(r => r.media_path).filter((v): v is string => !!v);
      const signed = paths.length ? await supabase.storage.from("business-media").createSignedUrls(paths, 300) : { data: [] };
      const enriched = rows.map(r => ({ ...r, profile: profileResult.data?.find(p => p.user_id === r.user_id) as Post["profile"], image: signed.data?.find(p => p.path === r.media_path)?.signedUrl, likes: (likesResult.data as any[] ?? []).filter(l => l.post_id === r.id).length, liked: (likesResult.data as any[] ?? []).some(l => l.post_id === r.id && l.user_id === user.id) }));
      setPosts(prev => next ? [...prev, ...enriched.filter(r => !prev.some(p => p.id === r.id))] : enriched);
      setMore(rows.length === 20); setPage(next);
    } catch { setError("Não foi possível carregar o feed. Tente novamente."); }
    finally { setLoading(false); }
  }, [user]);
  const search = useCallback(async (text = "") => {
    const { data, error: failure } = await supabase.rpc("search_business_people" as any, { _query: text });
    if (failure) { toast.error("Não foi possível buscar conexões"); return; }
    setPeople((data as unknown as Person[]) ?? []);
  }, []);
  useEffect(() => {
    if (!user) return;
    void loadFeed(); void search();
    let alive = true;
    void (async () => {
      const { data: brand } = await supabase.rpc("get_my_brand" as any).maybeSingle();
      if (!alive || !brand) return;
      const { data } = await supabase.from("campaigns" as any).select("id,name").eq("brand_id", (brand as any).id).eq("status", "active").eq("funded", true);
      if (alive) setCampaigns((data as any[]) ?? []);
    })();
    return () => { alive = false; };
  }, [user, loadFeed, search]);
  useEffect(() => {
    const id = params.get("campanha"); if (!id || !user) return;
    let alive = true;
    void supabase.rpc("get_business_campaign" as any, { _id: id }).then(({data,error:failure}) => { if (!alive) return; if (failure || !data) toast.error("Campanha indisponível"); else setSelected(data as unknown as CampaignNear); });
    return () => { alive = false; };
  }, [params, user]);
  const publish = async () => {
    if (!user || !content.trim() || busy) return;
    if (file && (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) { toast.error("Escolha uma imagem JPG, PNG ou WebP de até 5 MB."); return; }
    setBusy(true); let path: string | null = null;
    try {
      if (file) { path = `${user.id}/${crypto.randomUUID()}`; const upload = await supabase.storage.from("business-media").upload(path, file, { contentType: file.type }); if (upload.error) throw upload.error; }
      const {error:failure} = await supabase.from("business_posts" as any).insert({ user_id: user.id, content: content.trim(), media_path: path, campaign_id: campaignId || null });
      if (failure) throw failure;
      setContent(""); setFile(null); setCampaignId(""); toast.success("Publicado para suas conexões"); await loadFeed();
    } catch { if (path) await supabase.storage.from("business-media").remove([path]); toast.error("Não foi possível publicar. Tente novamente."); }
    finally { setBusy(false); }
  };
  const follow = async (person: Person) => {
    if (!user || acting) return; setActing(person.user_id);
    const {error:failure} = person.following ? await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", person.user_id) : await supabase.from("follows").insert({ follower_id: user.id, following_id: person.user_id });
    setActing(null); if (failure) toast.error("Não foi possível atualizar a conexão."); else { await search(query); await loadFeed(); }
  };
  const like = async (post: Post) => {
    if (!user || acting) return; setActing(post.id);
    const {error:failure} = post.liked ? await supabase.from("business_likes" as any).delete().eq("post_id",post.id).eq("user_id",user.id) : await supabase.from("business_likes" as any).insert({post_id:post.id,user_id:user.id});
    setActing(null); if(failure)toast.error("Não foi possível atualizar a curtida.");else setPosts(prev=>prev.map(p=>p.id===post.id?{...p,liked:!p.liked,likes:Math.max(0,p.likes+(p.liked?-1:1))}:p));
  };
  const chat = async (id: string) => { try { const conversation = await startConversation(id); if (conversation) navigate(`/chat?c=${conversation}`); } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível abrir a conversa."); } };
  const remove = async (post: Post) => { if (acting) return; setActing(post.id); const {error:failure}=await supabase.from("business_posts" as any).delete().eq("id",post.id); setActing(null); if(failure)toast.error("Não foi possível remover o post.");else { if(post.media_path)await supabase.storage.from("business-media").remove([post.media_path]);setPosts(prev=>prev.filter(p=>p.id!==post.id)); } };
  if(authLoading)return <Loader2 className="h-5 w-5 animate-spin" />;
  if(!user)return <Navigate to="/auth" replace />;
  return <div className="max-w-2xl mx-auto space-y-6 py-3">
    <header><h1 className="text-2xl font-bold tracking-tight">Negócios</h1><p className="mt-2 text-sm text-muted-foreground">Oportunidades, resultados e relacionamento entre marcas e creators.</p></header>
    <Tabs value={tab} onValueChange={setTab}><TabsList className="w-full"><TabsTrigger value="feed" className="flex-1">Feed</TabsTrigger><TabsTrigger value="connections" className="flex-1">Conexões</TabsTrigger><TabsTrigger value="history" className="flex-1">Histórico</TabsTrigger></TabsList>
      <TabsContent value="feed" className="space-y-5 mt-5">
        <section className="rounded-xl border border-border bg-card p-4 space-y-3"><h2 className="font-semibold">Compartilhe uma oportunidade ou resultado</h2><p className="text-xs text-muted-foreground">Somente perfis que você segue e que seguem você de volta podem ver seus posts e imagens.</p>
          <textarea aria-label="Texto do post de negócios" maxLength={3000} rows={3} placeholder="Conte sobre uma campanha, um resultado ou sua disponibilidade para eventos…" className="w-full border border-border rounded-lg bg-background p-3 text-sm" value={content} onChange={e=>setContent(e.target.value)} />
          <div className="flex flex-wrap gap-3 items-center"><label className="flex items-center gap-2 text-sm cursor-pointer rounded-lg border p-2"><ImagePlus className="h-4 w-4" /> Anexar imagem<input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]??null)} /></label>{file && <button type="button" className="text-xs underline break-all" onClick={()=>setFile(null)}>Remover {file.name}</button>}</div>
          {campaigns.length > 0 && <select aria-label="Campanha vinculada ao post" value={campaignId} onChange={e=>setCampaignId(e.target.value)} className="w-full border border-border rounded-lg bg-background p-2 text-sm"><option value="">Sem campanha vinculada</option>{campaigns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>}
          <Button onClick={publish} disabled={busy || !content.trim()}>{busy?"Publicando…":"Publicar para conexões"}</Button>
        </section>
        <div className="flex items-center justify-between"><h2 className="font-semibold">Seu feed de negócios</h2><Button variant="ghost" size="sm" disabled={loading} onClick={()=>loadFeed()}>Atualizar</Button></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!loading && !error && !posts.length && <div className="py-8 space-y-3"><p className="text-muted-foreground text-sm">Seu feed começa com suas conexões. Siga marcas e creators; quando seguirem você de volta, vocês poderão compartilhar posts.</p><Button variant="outline" onClick={()=>setTab("connections")}>Encontrar conexões</Button></div>}
        {posts.map(post=><article key={post.id} className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex justify-between gap-3"><Link to={`/u/${post.profile?.username??""}`} className="font-semibold text-sm hover:underline">{post.profile?.display_name || post.profile?.username || "Perfil"}</Link><time className="text-xs text-muted-foreground" dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString("pt-BR")}</time></div>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{post.content}</p>{post.image && <img src={post.image} alt="Imagem compartilhada no post de negócios" className="w-full rounded-lg max-h-[500px] object-contain" loading="lazy" />}
          {post.campaign_id && <Link to={`/negocios?campanha=${post.campaign_id}`} className="inline-flex rounded-lg border border-primary/40 px-3 py-2 text-sm text-primary">Ver campanha</Link>}
          <div className="flex gap-2 items-center"><Button variant="ghost" size="sm" aria-label={post.liked?"Remover curtida":"Curtir post"} aria-pressed={post.liked} disabled={acting===post.id} onClick={()=>like(post)}><Heart className="h-4 w-4 mr-2" fill={post.liked?"currentColor":"none"} />{post.likes}</Button>{post.user_id!==user.id?<Button variant="ghost" size="sm" onClick={()=>chat(post.user_id)}><MessageCircle className="h-4 w-4 mr-2" />Conversar</Button>:<Button variant="ghost" size="sm" onClick={()=>remove(post)} disabled={acting===post.id}><Trash2 className="h-4 w-4 mr-2" />Remover</Button>}</div>
        </article>)}
        {loading && <Loader2 aria-label="Carregando feed" className="h-5 w-5 animate-spin" />}{more && <Button variant="outline" disabled={loading} onClick={()=>loadFeed(page+1)}>Carregar mais</Button>}
      </TabsContent>
      <TabsContent value="connections" className="space-y-4 mt-5"><p className="text-sm text-muted-foreground">Siga para iniciar uma conexão. O feed compartilhado e o chat ficam disponíveis quando os dois perfis se seguem.</p><form className="flex gap-2" onSubmit={e=>{e.preventDefault();void search(query);}}><input className="flex-1 min-w-0 rounded-lg border border-border bg-background p-3 text-sm" aria-label="Buscar marcas e creators" placeholder="Nome da marca ou creator" value={query} onChange={e=>setQuery(e.target.value)} maxLength={100} /><Button type="submit">Buscar</Button></form>
        {!people.length&&<p className="text-sm text-muted-foreground">Nenhum perfil encontrado.</p>}{people.map(person=><article key={person.user_id} className="flex justify-between items-center gap-3 border-b border-border py-3"><div className="min-w-0"><Link to={`/u/${person.username}`} className="font-semibold text-sm hover:underline">{person.display_name}</Link><p className="text-xs text-muted-foreground">{person.mutual?"Conexão mútua":person.following?"Aguardando seguir de volta":`@${person.username}`}</p></div><div className="flex gap-2"><Button variant="outline" size="sm" disabled={!!acting} onClick={()=>follow(person)}>{person.following?"Deixar de seguir":"Seguir"}</Button>{person.mutual&&<Button variant="ghost" size="sm" aria-label={`Conversar com ${person.display_name}`} onClick={()=>chat(person.user_id)}><MessageCircle className="h-4 w-4" /></Button>}</div></article>)}
      </TabsContent>
      <TabsContent value="history" className="mt-5"><BusinessHistory userId={user.id} /></TabsContent>
    </Tabs>
    <CampaignSheet campaign={selected} open={!!selected} onOpenChange={open=>{if(!open){setSelected(null);setParams({});}}} />
  </div>;
}
