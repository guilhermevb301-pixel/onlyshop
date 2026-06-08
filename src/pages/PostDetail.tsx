import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Heart, MessageCircle, Share2, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface Post {
  id: string; user_id: string; content: string; media_url: string | null;
  post_type: string; likes_count: number; comments_count: number; created_at: string;
}
interface Profile { username: string; display_name: string; avatar_url: string | null; }
interface Comment { id: string; content: string; created_at: string; user_id: string; profile?: Profile; }

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [author, setAuthor] = useState<Profile | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const focusComment = () => {
    commentInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    commentInputRef.current?.focus();
  };

  useEffect(() => { if (id) load(); }, [id, user?.id]);

  const load = async () => {
    setLoading(true);
    const { data: p } = await supabase.from("posts").select("*").eq("id", id!).maybeSingle();
    if (!p) { setLoading(false); return; }
    setPost(p as Post);

    const { data: prof } = await supabase.from("profiles")
      .select("username, display_name, avatar_url").eq("user_id", p.user_id).maybeSingle();
    setAuthor(prof as Profile);

    const { data: cmts } = await supabase.from("comments")
      .select("id, content, created_at, user_id")
      .eq("post_id", id!).order("created_at", { ascending: true });

    if (cmts?.length) {
      const ids = [...new Set(cmts.map(c => c.user_id))];
      const { data: profs } = await supabase.from("profiles")
        .select("user_id, username, display_name, avatar_url").in("user_id", ids);
      setComments(cmts.map(c => ({ ...c, profile: profs?.find(pr => pr.user_id === c.user_id) as any })));
    } else setComments([]);

    if (user) {
      const { data: lk } = await supabase.from("likes")
        .select("id").eq("post_id", id!).eq("user_id", user.id).maybeSingle();
      setLiked(!!lk);
    }
    setLoading(false);
  };

  const toggleLike = async () => {
    if (!user || !post) return;
    if (liked) {
      await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      setLiked(false);
      setPost({ ...post, likes_count: Math.max(0, post.likes_count - 1) });
    } else {
      await supabase.from("likes").insert({ post_id: post.id, user_id: user.id });
      setLiked(true);
      setPost({ ...post, likes_count: post.likes_count + 1 });
      if (post.user_id !== user.id) {
        await supabase.from("notifications").insert({
          user_id: post.user_id, actor_id: user.id, type: "like", post_id: post.id,
        });
      }
    }
  };

  const submitComment = async () => {
    if (!user || !post || !newComment.trim()) return;
    setSending(true);
    const { error } = await supabase.from("comments").insert({
      post_id: post.id, user_id: user.id, content: newComment.trim(),
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      if (post.user_id !== user.id) {
        await supabase.from("notifications").insert({
          user_id: post.user_id, actor_id: user.id, type: "comment", post_id: post.id,
        });
      }
      setNewComment("");
      load();
    }
    setSending(false);
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ url, title: "Veja este post" }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copiado!" });
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Post não encontrado</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-3 flex items-center gap-3">
        <Button size="icon" variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="font-bold">Publicação</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Card className="overflow-hidden bg-card/40 backdrop-blur-2xl border-white/10">
          {/* Author */}
          <Link
            to={author?.username ? `/u/${author.username}` : "#"}
            onClick={(e) => { if (!author?.username) e.preventDefault(); }}
            className="flex items-center gap-3 p-4"
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={author?.avatar_url || undefined} />
              <AvatarFallback>{author?.display_name?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{author?.display_name || author?.username}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </Link>

          {/* Media */}
          {post.media_url && (
            <div className="bg-black/40 max-h-[80vh] overflow-hidden flex items-center justify-center">
              {post.post_type === "video" ? (
                <video src={post.media_url} controls className="w-full max-h-[80vh]" />
              ) : (
                <img src={post.media_url} className="w-full max-h-[80vh] object-contain" />
              )}
            </div>
          )}

          {/* Content */}
          {post.content && <p className="px-4 py-3 text-sm whitespace-pre-wrap">{post.content}</p>}

          {/* Actions */}
          <div className="flex items-center gap-1 px-3 py-2 border-t border-white/5">
            <Button variant="ghost" size="sm" onClick={toggleLike} className={liked ? "text-red-500" : ""}>
              <Heart className={`w-5 h-5 mr-1 ${liked ? "fill-current" : ""}`} /> {post.likes_count}
            </Button>
            <Button variant="ghost" size="sm" onClick={focusComment}>
              <MessageCircle className="w-5 h-5 mr-1" /> {post.comments_count}
            </Button>
            <Button variant="ghost" size="sm" onClick={share} className="ml-auto">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </Card>

        {/* Comments */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm">Comentários ({comments.length})</h3>
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Seja o primeiro a comentar</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={c.profile?.avatar_url || undefined} />
                  <AvatarFallback>{c.profile?.display_name?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-card/30 rounded-2xl px-3 py-2">
                  <p className="text-xs font-semibold">{c.profile?.display_name || c.profile?.username}</p>
                  <p className="text-sm">{c.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Comment input */}
      {user && (
        <div className="fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border/40 p-3">
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            <Input
              ref={commentInputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Comentar..."
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
            />
            <Button size="icon" onClick={submitComment} disabled={sending || !newComment.trim()}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
