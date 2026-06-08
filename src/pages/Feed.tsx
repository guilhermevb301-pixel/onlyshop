import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { InstagramPost, PostData } from "@/components/feed/InstagramPost";
import { CreatePostDialog } from "@/components/feed/CreatePostDialog";
import { CommentsSheet } from "@/components/feed/CommentsSheet";
import { StoriesBar } from "@/components/feed/StoriesBar";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { Loader2, Sparkles, MessageSquare, Users2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useGamification } from "@/hooks/useGamification";

const PAGE_SIZE = 15;

// Comunidade de exemplo (a "tribo de quem fatura" — áudios 1 e 4). Mostrada
// quando o feed real ainda está vazio, pra a comunidade nunca parecer morta.
function demoPosts(): PostData[] {
  const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  return [
    {
      id: "demo-p0", content: "Cheguei essa semana, ainda não vendi nada, tô com medo mas vim 😅 Alguém mais começando do zero? bora se ajudar 🙏",
      postType: "text", likesCount: 38, commentsCount: 12, createdAt: ago(1), userId: "demo-u0",
      label: null,
      profile: { username: "rafa.comeco", displayName: "Rafael", avatarUrl: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&h=150&fit=crop&crop=faces", isVerified: false, totalEarnings: 0 },
    },
    {
      id: "demo-p1", content: "Bati R$ 340 de comissão ONTEM com 1 vídeo só do sérum 🤯 Gerei pela IA, postei e foi. Quem tá na dúvida, começa HOJE.",
      postType: "text", likesCount: 1240, commentsCount: 87, createdAt: ago(5), userId: "demo-u1",
      label: "verified_result",
      profile: { username: "marina.vende", displayName: "Marina Sales", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces", isVerified: true, totalEarnings: 18400 },
      affiliateLink: { url: "#", productName: "Sérum Vitamina C Glow", commission: 35 },
    },
    {
      id: "demo-p2", content: "PRIMEIRA VENDA HOJE 🎉🥹 chorei de verdade. Nunca apareci num vídeo, a influencer de IA fez tudo. Obrigada OnlyShop 🙏",
      postType: "text", likesCount: 2110, commentsCount: 156, createdAt: ago(9), userId: "demo-u2",
      label: "verified_result",
      profile: { username: "bia.nova", displayName: "Bia Rocha", avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=faces", isVerified: false, totalEarnings: 290 },
    },
    {
      id: "demo-p3", content: "Subi pra Prata 🥈 47 vendas no mês. Quem tá começando: NÃO desiste na 1ª semana. O jogo vira no volume.",
      postType: "image", mediaUrl: "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=600", likesCount: 870, commentsCount: 43, createdAt: ago(20), userId: "demo-u3",
      label: null,
      profile: { username: "joaop.afiliado", displayName: "João Pedro", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces", isVerified: true, totalEarnings: 45200 },
    },
    {
      id: "demo-p4", content: "R$ 2.140 esse mês 🚀 Mês passado eu tava no CLT. Hoje vivo disso, de casa, sem aparecer. Isso aqui é real.",
      postType: "text", likesCount: 3320, commentsCount: 201, createdAt: ago(28), userId: "demo-u4",
      label: "verified_result",
      profile: { username: "ana.clara", displayName: "Ana Clara", avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces", isVerified: true, totalEarnings: 56200 },
    },
    {
      id: "demo-p5", content: "12 vídeos essa semana, 3 estouraram 📈 Segredo não tem: volume + constância. Bora galera 🔥",
      postType: "text", likesCount: 640, commentsCount: 29, createdAt: ago(40), userId: "demo-u5",
      label: null,
      profile: { username: "lucas.f", displayName: "Lucas Ferreira", avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces", isVerified: false, totalEarnings: 9800 },
    },
  ];
}

export default function Feed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addPoints } = useGamification();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);

  const mapPosts = useCallback(
    (postsData: any[], profilesMap: Map<string, any>, likedPostIds: Set<string>): PostData[] =>
      postsData.map((post) => {
        const p = profilesMap.get(post.user_id);
        return {
          id: post.id,
          content: post.content,
          postType: post.post_type as "text" | "image" | "video",
          mediaUrl: post.media_url || undefined,
          likesCount: post.likes_count,
          commentsCount: post.comments_count,
          createdAt: post.created_at,
          userId: post.user_id,
          isLiked: likedPostIds.has(post.id),
          isSaved: false,
          label: (post as any).label || null,
          labelMetadata: (post as any).label_metadata || null,
          profile: p
            ? { username: p.username || "user", displayName: p.display_name || "Usuário", avatarUrl: p.avatar_url || undefined, isVerified: false }
            : undefined,
        };
      }),
    []
  );

  const enrichPosts = useCallback(
    async (postsData: any[]) => {
      const userIds = [...new Set(postsData.map((p) => p.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);
      const profilesMap = new Map(profilesData?.map((p) => [p.user_id, p]) || []);

      let likedPostIds = new Set<string>();
      if (user) {
        const postIds = postsData.map((p) => p.id);
        const { data: likes } = await supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds);
        likedPostIds = new Set(likes?.map((l) => l.post_id) || []);
      }
      return mapPosts(postsData, profilesMap, likedPostIds);
    },
    [user, mapPosts]
  );

  const fetchPosts = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      try {
        const { data: postsData, error } = await supabase
          .from("posts").select("*").order("created_at", { ascending: false }).limit(PAGE_SIZE);
        if (error) throw error;
        if (!postsData || postsData.length === 0) {
          setPosts(demoPosts());
          setHasMore(false);
          return;
        }
        const enriched = await enrichPosts(postsData);
        setPosts(enriched);
        setHasMore(postsData.length === PAGE_SIZE);
        cursorRef.current = postsData[postsData.length - 1].created_at;
      } catch (error) {
        console.error("Error fetching posts:", error);
        setPosts(demoPosts());
        setHasMore(false);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [enrichPosts]
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursorRef.current) return;
    setLoadingMore(true);
    try {
      const { data: postsData, error } = await supabase
        .from("posts").select("*").order("created_at", { ascending: false }).lt("created_at", cursorRef.current).limit(PAGE_SIZE);
      if (error) throw error;
      if (!postsData || postsData.length === 0) { setHasMore(false); return; }
      const enriched = await enrichPosts(postsData);
      setPosts((prev) => [...prev, ...enriched]);
      setHasMore(postsData.length === PAGE_SIZE);
      cursorRef.current = postsData[postsData.length - 1].created_at;
    } catch (error) {
      console.error("Error loading more:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, enrichPosts]);

  const sentinelRef = useInfiniteScroll(loadMore, { enabled: hasMore && !loadingMore });

  const { containerRef, pullDistance, refreshing: pullRefreshing } = usePullToRefresh({
    onRefresh: async () => { await fetchPosts(true); },
  });

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const createNotification = useCallback(async (targetUserId: string, type: string, postId: string) => {
    if (!user || user.id === targetUserId) return;
    try {
      await supabase.from("notifications").insert({
        user_id: targetUserId,
        actor_id: user.id,
        type,
        post_id: postId,
      });
    } catch { }
  }, [user]);

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) {
      toast({ title: "Faça login", description: "Você precisa estar logado para curtir" });
      return;
    }
    const post = posts.find((p) => p.id === postId);
    setPosts((prev) =>
      prev.map((p) => p.id === postId ? { ...p, isLiked: !isLiked, likesCount: isLiked ? p.likesCount - 1 : p.likesCount + 1 } : p)
    );
    try {
      if (isLiked) {
        await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("likes").insert({ post_id: postId, user_id: user.id });
        if (post) createNotification(post.userId, "like", postId);
        addPoints("like", { post_id: postId });
      }
    } catch {
      setPosts((prev) =>
        prev.map((p) => p.id === postId ? { ...p, isLiked, likesCount: isLiked ? p.likesCount + 1 : p.likesCount - 1 } : p)
      );
    }
  };

  const handleSave = (postId: string) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, isSaved: !p.isSaved } : p)));
  };

  const handleShare = async (post: PostData) => {
    const shareData = { title: `Post de @${post.profile?.username || "user"}`, text: post.content.slice(0, 100), url: window.location.origin + `/post/${post.id}` };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(shareData.url); toast({ title: "Link copiado!" }); }
    } catch { }
  };

  const handleComment = (postId: string) => setCommentsPostId(postId);

  const handleCommentAdded = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p));
    if (post) createNotification(post.userId, "comment", postId);
    addPoints("comment", { post_id: postId });
  };

  const handleFollow = () => {
    toast({ title: "Seguindo!", description: "Você começou a seguir este usuário" });
  };

  const handleProfileClick = (post: PostData) => {
    if (post.profile?.username) navigate(`/u/${post.profile.username}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="max-w-lg mx-auto overflow-auto hide-scrollbar">
      {/* Header da comunidade — feed de resultados + canal de conversa (áudio 1) */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-tight flex items-center gap-1.5">
            <Users2 className="h-4 w-4 text-primary" /> Comunidade
          </h1>
          <p className="text-xs text-muted-foreground">Resultados, primeiros vídeos e quem tá começando do zero. Aqui ninguém vende sozinho.</p>
        </div>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link to="/chat"><MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Conversar</Link>
        </Button>
      </div>

      {/* Pull to refresh */}
      <div
        className="flex justify-center items-center overflow-hidden transition-all duration-200"
        style={{ height: pullDistance > 0 ? pullDistance : 0 }}
      >
        <Loader2
          className={`h-4 w-4 text-muted-foreground/40 transition-transform ${pullRefreshing ? "animate-spin" : ""}`}
          style={{ transform: `rotate(${pullDistance * 3}deg)` }}
        />
      </div>

      {/* Stories */}
      <StoriesBar />

      {/* Divider */}
      <div className="h-px bg-border/30" />

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-6">
          <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-muted-foreground/20" />
          </div>
          <h2 className="text-sm font-bold">A tribo de quem fatura</h2>
          <p className="text-xs text-muted-foreground/40 max-w-xs">
            Aqui é o campo de batalha: vendas, marcos e quem subiu de nível. Faça sua primeira venda e poste seu resultado pra inspirar a galera.
          </p>
        </div>
      ) : (
        <div>
          {posts.map((post, index) => (
            <div key={post.id} className="animate-fade-in" style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}>
              <InstagramPost
                post={post}
                onLike={() => handleLike(post.id, !!post.isLiked)}
                onComment={() => handleComment(post.id)}
                onShare={() => handleShare(post)}
                onSave={() => handleSave(post.id)}
                onFollow={handleFollow}
                onProfileClick={() => handleProfileClick(post)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="py-8 flex justify-center">
        {loadingMore && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/30" />}
        {!hasMore && posts.length > 0 && <p className="text-[11px] text-muted-foreground/30">Você viu tudo ✨</p>}
      </div>

      {/* FAB */}
      {user && (
        <div className="fixed bottom-20 right-4 z-30 md:bottom-6">
          <CreatePostDialog onPostCreated={() => { fetchPosts(); addPoints("post"); }} />
        </div>
      )}
      <CommentsSheet
        postId={commentsPostId}
        open={!!commentsPostId}
        onOpenChange={(open) => !open && setCommentsPostId(null)}
        onCommentAdded={handleCommentAdded}
      />
    </div>
  );
}
