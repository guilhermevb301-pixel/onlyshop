import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, TrendingUp, Users, ShoppingBag, Star, ArrowLeft, Trophy, UserPlus, UserCheck, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PublicProfileData {
  user_id: string; username: string; display_name: string; avatar_url: string;
  bio: string; city: string; state: string; niches: string[]; categories: string[];
  followers_count: number; total_sales: number;
  conversion_rate: number; performance_score: number;
}
interface UserLevel { total_xp: number; level: string; }

const levelColors: Record<string, string> = {
  bronze: "from-amber-700 to-amber-500",
  prata: "from-gray-400 to-gray-200",
  ouro: "from-yellow-500 to-yellow-300",
  diamante: "from-cyan-400 to-blue-500",
  elite: "from-purple-500 to-pink-500",
};

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [level, setLevel] = useState<UserLevel | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [hotProducts, setHotProducts] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (username) load(); }, [username, user?.id]);

  const load = async () => {
    setLoading(true);
    const { data: p } = await supabase.from("profiles")
      // Só colunas de vitrine — nunca coordenada, endereço, receita ou indicação.
      .select("user_id, username, display_name, avatar_url, bio, city, state, niches, categories, followers_count, total_sales, conversion_rate, performance_score")
      .eq("username", username!).maybeSingle();
    if (!p) { setLoading(false); return; }
    setProfile(p as PublicProfileData);

    const [{ data: lvl }, { data: pst }, { data: ords }] = await Promise.all([
      supabase.from("user_levels").select("total_xp, level").eq("user_id", p.user_id).maybeSingle(),
      supabase.from("posts")
        .select("id, content, media_url, post_type, likes_count, comments_count, created_at")
        .eq("user_id", p.user_id).order("created_at", { ascending: false }).limit(12),
      supabase.from("orders").select("id").eq("affiliate_id", p.user_id).in("status", ["paid", "completed"]).limit(200),
    ]);
    setLevel(lvl as any);
    setPosts(pst || []);

    // Hot products vendidos pelo afiliado
    if (ords?.length) {
      const orderIds = ords.map(o => o.id);
      const { data: items } = await supabase.from("order_items")
        .select("product_id, product_name, quantity, unit_price").in("order_id", orderIds);
      if (items?.length) {
        const map = new Map<string, { product_id: string; name: string; sales: number; revenue: number }>();
        items.forEach(it => {
          const cur = map.get(it.product_id) || { product_id: it.product_id, name: it.product_name, sales: 0, revenue: 0 };
          cur.sales += it.quantity;
          cur.revenue += Number(it.unit_price) * it.quantity;
          map.set(it.product_id, cur);
        });
        const top = [...map.values()].sort((a, b) => b.sales - a.sales).slice(0, 6);
        if (top.length) {
          const { data: prods } = await supabase.from("products")
            .select("id, name, image_url, price").in("id", top.map(t => t.product_id));
          setHotProducts(top.map(t => ({ ...t, product: prods?.find(pr => pr.id === t.product_id) })));
        }
      }
    }

    if (user && user.id !== p.user_id) {
      const { data: f } = await supabase.from("follows").select("id")
        .eq("follower_id", user.id).eq("following_id", p.user_id).maybeSingle();
      setIsFollowing(!!f);
    }
    setLoading(false);
  };

  const toggleFollow = async () => {
    if (!user || !profile) {
      toast({ title: "Faça login para seguir", variant: "destructive" });
      return;
    }
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from("follows").delete()
        .eq("follower_id", user.id).eq("following_id", profile.user_id);
      setIsFollowing(false);
      setProfile({ ...profile, followers_count: Math.max(0, profile.followers_count - 1) });
    } else {
      const { error } = await supabase.from("follows")
        .insert({ follower_id: user.id, following_id: profile.user_id });
      if (!error) {
        setIsFollowing(true);
        setProfile({ ...profile, followers_count: profile.followers_count + 1 });
        await supabase.from("notifications").insert({
          user_id: profile.user_id, actor_id: user.id, type: "follow",
        });
      } else {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      }
    }
    setFollowLoading(false);
  };

  const startChat = async () => {
    if (!user || !profile) return;
    // Find or create conversation
    const { data: convs } = await supabase.from("conversation_participants")
      .select("conversation_id").eq("user_id", user.id);
    const convIds = convs?.map(c => c.conversation_id) || [];
    let convId: string | null = null;
    if (convIds.length) {
      const { data: shared } = await supabase.from("conversation_participants")
        .select("conversation_id").eq("user_id", profile.user_id).in("conversation_id", convIds);
      convId = shared?.[0]?.conversation_id || null;
    }
    if (!convId) {
      const { data: newC } = await supabase.from("conversations").insert({}).select().single();
      if (newC) {
        await supabase.from("conversation_participants").insert([
          { conversation_id: newC.id, user_id: user.id },
          { conversation_id: newC.id, user_id: profile.user_id },
        ]);
        convId = newC.id;
      }
    }
    window.location.href = `/chat?c=${convId}`;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Perfil não encontrado</p>
        <Link to="/feed"><Button variant="outline">Voltar</Button></Link>
      </div>
    );
  }

  const lvlKey = level?.level || "bronze";
  const lvlGrad = levelColors[lvlKey] || levelColors.bronze;
  const isOwn = user?.id === profile.user_id;

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-3 flex items-center gap-3">
        <Link to="/discover"><Button size="icon" variant="ghost"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <h1 className="font-bold">@{profile.username}</h1>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <Card className="p-6 bg-card/40 backdrop-blur-2xl border-white/10">
          <div className="flex items-start gap-5">
            <div className="relative">
              <Avatar className="w-24 h-24 ring-2 ring-primary/40">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback>{profile.display_name?.[0] || "U"}</AvatarFallback>
              </Avatar>
              {level && (
                <div className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gradient-to-r ${lvlGrad} text-white shadow-lg`}>
                  {level.level}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">{profile.display_name || profile.username}</h2>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
              {profile.bio && <p className="text-sm mt-2">{profile.bio}</p>}
              {(profile.city || profile.state) && (
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {[profile.city, profile.state].filter(Boolean).join(", ")}
                </div>
              )}
            </div>
          </div>

          {profile.niches?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-4">
              {profile.niches.map((n) => (<Badge key={n} variant="secondary" className="text-xs">{n}</Badge>))}
            </div>
          )}

          {!isOwn && (
            <div className="flex gap-2 mt-4">
              <Button onClick={toggleFollow} disabled={followLoading} variant={isFollowing ? "outline" : "default"} className="flex-1">
                {followLoading ? <Loader2 className="w-4 h-4 animate-spin" />
                  : isFollowing ? <><UserCheck className="w-4 h-4 mr-1" /> Seguindo</>
                  : <><UserPlus className="w-4 h-4 mr-1" /> Seguir</>}
              </Button>
              <Button variant="outline" onClick={startChat} className="flex-1">
                <MessageCircle className="w-4 h-4 mr-1" /> Mensagem
              </Button>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 bg-card/40 backdrop-blur-2xl border-white/10">
            <Users className="w-5 h-5 text-primary mb-2" />
            <p className="text-2xl font-bold tabular-nums">{Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(profile.followers_count || 0)}</p>
            <p className="text-xs text-muted-foreground">Seguidores</p>
          </Card>
          <Card className="p-4 bg-card/40 backdrop-blur-2xl border-white/10">
            <ShoppingBag className="w-5 h-5 text-green-500 mb-2" />
            <p className="text-2xl font-bold">{profile.total_sales || 0}</p>
            <p className="text-xs text-muted-foreground">Vendas</p>
          </Card>
          <Card className="p-4 bg-card/40 backdrop-blur-2xl border-white/10">
            <TrendingUp className="w-5 h-5 text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{Number(profile.conversion_rate || 0).toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Conversão</p>
          </Card>
          <Card className="p-4 bg-card/40 backdrop-blur-2xl border-white/10">
            <Star className="w-5 h-5 text-yellow-500 mb-2" />
            <p className="text-2xl font-bold">{Number(profile.performance_score || 0).toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Score</p>
          </Card>
        </div>

        {level && (
          <Card className="p-4 bg-card/40 backdrop-blur-2xl border-white/10">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <div className="flex-1">
                <p className="text-sm font-semibold">{level.total_xp.toLocaleString()} XP</p>
                <p className="text-xs text-muted-foreground capitalize">Nível {level.level}</p>
              </div>
            </div>
          </Card>
        )}

        {hotProducts.length > 0 && (
          <div>
            <h3 className="font-bold mb-3 flex items-center gap-2">
              🔥 Produtos mais hypados
              <span className="text-xs font-normal text-muted-foreground">por @{profile.username}</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {hotProducts.map((hp) => (
                <Card key={hp.product_id} className="overflow-hidden bg-card/40 backdrop-blur-2xl border-white/10">
                  {hp.product?.image_url && (
                    <div className="aspect-square bg-muted">
                      <img src={hp.product.image_url} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-sm font-semibold line-clamp-2">{hp.name}</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="secondary" className="text-[10px]">🔥 {hp.sales} vendas</Badge>
                      {hp.product?.price && (
                        <p className="text-xs font-bold text-primary">R$ {Number(hp.product.price).toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="font-bold mb-3">Publicações recentes</h3>
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma publicação ainda</p>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {posts.map((p) => (
                <Link key={p.id} to={`/post/${p.id}`} className="aspect-square bg-muted rounded-md overflow-hidden block hover:opacity-80 transition">
                  {p.media_url ? (
                    <img src={p.media_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-2 text-xs text-center bg-card/50">
                      {p.content?.slice(0, 60)}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
