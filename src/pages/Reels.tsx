import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Heart, MessageCircle, Share2, ShoppingBag, Volume2, VolumeX, Play, Pause, ChevronUp, ChevronDown, Bookmark, Radio } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useGamification } from "@/hooks/useGamification";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ReelData {
  id: string;
  content: string;
  mediaUrl: string;
  likesCount: number;
  commentsCount: number;
  userId: string;
  isLiked: boolean;
  createdAt: string;
  profile?: {
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  product?: {
    id: string;
    name: string;
    price: number;
    commission: number;
    imageUrl?: string;
  } | null;
}

function ReelCard({
  reel,
  isActive,
  isFollowing,
  onLike,
  onShare,
  onComment,
  onFollow,
}: {
  reel: ReelData;
  isActive: boolean;
  isFollowing: boolean;
  onLike: () => void;
  onShare: () => void;
  onComment: () => void;
  onFollow: () => void;
}) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [saved, setSaved] = useState(false);
  const [doubleTapLike, setDoubleTapLike] = useState(false);
  const lastTapRef = useRef(0);

  const toggleSave = () => {
    setSaved((s) => !s);
    toast({ title: saved ? "Removido dos salvos" : "Salvo!" });
  };

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive && !paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isActive, paused]);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap → like
      if (!reel.isLiked) onLike();
      setDoubleTapLike(true);
      setTimeout(() => setDoubleTapLike(false), 800);
    } else {
      // Single tap → pause/play
      setPaused((p) => !p);
    }
    lastTapRef.current = now;
  };

  return (
    <div className="relative h-full w-full snap-start snap-always bg-black">
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.mediaUrl}
        className="absolute inset-0 h-full w-full object-cover"
        loop
        muted={muted}
        playsInline
        onClick={handleTap}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

      {/* Double-tap heart */}
      {doubleTapLike && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <Heart className="h-24 w-24 text-red-500 fill-red-500 animate-ping" />
        </div>
      )}

      {/* Pause indicator */}
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="h-16 w-16 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
            <Play className="h-8 w-8 text-white ml-1" />
          </div>
        </div>
      )}

      {/* Right sidebar actions */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
        <button onClick={onLike} className="flex flex-col items-center gap-1">
          <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", reel.isLiked ? "bg-red-500/20" : "bg-white/10 backdrop-blur-sm")}>
            <Heart className={cn("h-5 w-5", reel.isLiked ? "text-red-500 fill-red-500" : "text-white")} />
          </div>
          <span className="text-[10px] text-white font-semibold">{reel.likesCount}</span>
        </button>

        <button onClick={onComment} className="flex flex-col items-center gap-1">
          <div className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <span className="text-[10px] text-white font-semibold">{reel.commentsCount}</span>
        </button>

        <button onClick={onShare} className="flex flex-col items-center gap-1">
          <div className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-[10px] text-white font-semibold">Enviar</span>
        </button>

        <button onClick={toggleSave} className="flex flex-col items-center gap-1">
          <div className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <Bookmark className={cn("h-5 w-5 text-white", saved && "fill-white")} />
          </div>
          <span className="text-[10px] text-white font-semibold">{saved ? "Salvo" : "Salvar"}</span>
        </button>

        <button onClick={() => setMuted(!muted)}>
          <div className="h-10 w-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
            {muted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
          </div>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-4 left-3 right-16 z-10">
        {/* Product tag */}
        {reel.product && (
          <Link to="/products" className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 mb-3 border border-white/10">
            <ShoppingBag className="h-4 w-4 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{reel.product.name}</p>
              <p className="text-[10px] text-white/60">R$ {reel.product.price.toFixed(2)} • {reel.product.commission}% comissão</p>
            </div>
            <Badge variant="secondary" className="text-[9px] bg-primary/20 text-primary border-0">
              Promover
            </Badge>
          </Link>
        )}

        {/* User info */}
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-8 w-8 border-2 border-white/30">
            <AvatarImage src={reel.profile?.avatarUrl} />
            <AvatarFallback className="text-[10px] bg-muted text-white">{(reel.profile?.displayName || "U")[0]}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-bold text-white">@{reel.profile?.username || "user"}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={onFollow}
            disabled={isFollowing}
            className="h-6 text-[10px] rounded-full border-white/30 text-white bg-white/10 hover:bg-white/20 px-3 disabled:opacity-100"
          >
            {isFollowing ? "Seguindo" : "Seguir"}
          </Button>
        </div>

        {/* Caption */}
        <p className="text-xs text-white/90 line-clamp-2 leading-relaxed">{reel.content}</p>
      </div>

      {/* Live indicator */}
      <div className="absolute top-4 left-3 z-10">
        <Link to="/live">
          <Badge className="bg-red-500/90 text-white border-0 gap-1 text-[10px] hover:bg-red-500">
            <Radio className="h-3 w-3 animate-pulse" />
            LIVE
          </Badge>
        </Link>
      </div>

      {/* Scroll hints */}
      <div className="absolute top-1/2 right-1 -translate-y-1/2 flex flex-col gap-1 opacity-30 pointer-events-none">
        <ChevronUp className="h-4 w-4 text-white" />
        <ChevronDown className="h-4 w-4 text-white" />
      </div>
    </div>
  );
}

export default function Reels() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addPoints } = useGamification();
  const navigate = useNavigate();
  const [reels, setReels] = useState<ReelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchReels = useCallback(async () => {
    try {
      const { data: posts, error } = await supabase
        .from("posts")
        .select("*")
        .eq("post_type", "video")
        .not("media_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      if (!posts?.length) { setReels([]); setLoading(false); return; }

      const userIds = [...new Set(posts.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);
      const profilesMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      // Fetch random products for tagging
      const { data: products } = await supabase
        .from("products")
        .select("id, name, price, commission_value, image_url")
        .eq("active", true)
        .limit(10);

      let likedIds = new Set<string>();
      if (user) {
        const { data: likes } = await supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", posts.map((p) => p.id));
        likedIds = new Set(likes?.map((l) => l.post_id) || []);
      }

      const mapped: ReelData[] = posts.map((post, i) => {
        const p = profilesMap.get(post.user_id);
        const product = products && products.length > 0 ? products[i % products.length] : null;
        return {
          id: post.id,
          content: post.content,
          mediaUrl: post.media_url!,
          likesCount: post.likes_count,
          commentsCount: post.comments_count,
          userId: post.user_id,
          isLiked: likedIds.has(post.id),
          createdAt: post.created_at,
          profile: p ? { username: p.username || "user", displayName: p.display_name || "Usuário", avatarUrl: p.avatar_url || undefined } : undefined,
          product: product ? { id: product.id, name: product.name, price: product.price, commission: product.commission_value, imageUrl: product.image_url || undefined } : null,
        };
      });

      setReels(mapped);
    } catch (e) {
      console.error("Error fetching reels:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchReels(); }, [fetchReels]);

  // Observe which reel is in view
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-index"));
            if (!isNaN(idx)) setActiveIndex(idx);
          }
        });
      },
      { root: container, threshold: 0.6 }
    );
    container.querySelectorAll("[data-index]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [reels]);

  const handleLike = async (reel: ReelData) => {
    if (!user) { toast({ title: "Faça login para curtir" }); return; }
    setReels((prev) =>
      prev.map((r) => r.id === reel.id ? { ...r, isLiked: !r.isLiked, likesCount: r.isLiked ? r.likesCount - 1 : r.likesCount + 1 } : r)
    );
    try {
      if (reel.isLiked) {
        await supabase.from("likes").delete().eq("post_id", reel.id).eq("user_id", user.id);
      } else {
        await supabase.from("likes").insert({ post_id: reel.id, user_id: user.id });
        addPoints("like", { post_id: reel.id });
      }
    } catch {
      setReels((prev) =>
        prev.map((r) => r.id === reel.id ? { ...r, isLiked: reel.isLiked, likesCount: reel.likesCount } : r)
      );
    }
  };

  const handleShare = async (reel: ReelData) => {
    const url = `${window.location.origin}/reels?id=${reel.id}`;
    try {
      if (navigator.share) await navigator.share({ title: "Confira esse reel!", url });
      else { await navigator.clipboard.writeText(url); toast({ title: "Link copiado!" }); }
    } catch {}
  };

  // Comentar abre o post completo (com a thread de comentários).
  const handleComment = (reel: ReelData) => navigate(`/post/${reel.id}`);

  const handleFollow = async (reel: ReelData) => {
    if (!user) { toast({ title: "Faça login para seguir" }); return; }
    if (reel.userId === user.id || following.has(reel.userId)) return;
    setFollowing((prev) => new Set(prev).add(reel.userId));
    try {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: reel.userId });
      toast({ title: `Seguindo @${reel.profile?.username || "usuário"} ✓` });
    } catch {
      // já segue ou erro — mantém o estado otimista, sem quebrar.
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100dvh-7rem)] flex items-center justify-center bg-black">
        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="h-[calc(100dvh-7rem)] flex flex-col items-center justify-center bg-black text-white gap-4 px-6 text-center">
        <Play className="h-12 w-12 text-muted-foreground/30" />
        <h2 className="text-lg font-bold">Nenhum Reel ainda</h2>
        <p className="text-sm text-white/40">Publique vídeos no feed para aparecerem aqui como Reels.</p>
        <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
          <Link to="/feed">Ir para o Feed</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[calc(100dvh-7rem)] overflow-y-scroll snap-y snap-mandatory hide-scrollbar bg-black"
    >
      {reels.map((reel, i) => (
        <div key={reel.id} data-index={i} className="h-[calc(100dvh-7rem)] w-full">
          <ReelCard
            reel={reel}
            isActive={i === activeIndex}
            isFollowing={following.has(reel.userId)}
            onLike={() => handleLike(reel)}
            onShare={() => handleShare(reel)}
            onComment={() => handleComment(reel)}
            onFollow={() => handleFollow(reel)}
          />
        </div>
      ))}
    </div>
  );
}
