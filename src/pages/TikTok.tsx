import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { tiktokApi } from "@/lib/api/tiktok";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Link2,
  Users,
  Heart,
  Video,
  Eye,
  MessageCircle,
  Share2,
  ExternalLink,
  RefreshCw,
  Unplug,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TikTokConnection {
  tiktok_username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  followers_count: number;
  following_count: number;
  likes_count: number;
  video_count: number;
  is_verified: boolean;
  last_synced_at: string | null;
}

interface TikTokVideo {
  id: string;
  title: string;
  video_description: string;
  create_time: number;
  cover_image_url: string;
  share_url: string;
  duration: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
}

export default function TikTok() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connection, setConnection] = useState<TikTokConnection | null>(null);
  const [videos, setVideos] = useState<TikTokVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const fetchConnection = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase.rpc("get_my_tiktok_connection" as never);
    setConnection(((Array.isArray(data) ? data[0] : data) as TikTokConnection) || null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    if (code && user) {
      handleOAuthCallback(code);
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [user]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/tiktok/callback`;
      const result = await tiktokApi.getAuthUrl(redirectUri);

      if (result.success && result.auth_url) {
        localStorage.setItem("tiktok_oauth_state", result.state);
        window.location.href = result.auth_url;
      } else {
        toast({ variant: "destructive", title: "Erro", description: result.error || "Falha ao iniciar conexão" });
      }
    } catch {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao conectar com TikTok" });
    } finally {
      setConnecting(false);
    }
  };

  const handleOAuthCallback = async (code: string) => {
    if (!user) return;
    setLoading(true);

    try {
      const redirectUri = `${window.location.origin}/tiktok/callback`;
      const result = await tiktokApi.exchangeToken(code, redirectUri);

      if (!result.success) throw new Error(result.error);

      const { user: tiktokUser } = result;

      toast({ title: "TikTok conectado!", description: `@${tiktokUser.tiktok_username}` });
      fetchConnection();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro na conexão", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!connection) return;
    setSyncing(true);

    try {
      const statsResult = await tiktokApi.getUserStats();
      if (statsResult.success && statsResult.data) {
        const s = statsResult.data;
        setConnection((current) => current ? ({ ...current, followers_count: s.follower_count || 0, following_count: s.following_count || 0, likes_count: s.likes_count || 0, video_count: s.video_count || 0, last_synced_at: new Date().toISOString() }) : current);
        toast({ title: "Métricas atualizadas!" });
      }

      const videosResult = await tiktokApi.getVideoList();
      if (videosResult.success) {
        setVideos(videosResult.videos || []);
      }
    } catch {
      toast({ variant: "destructive", title: "Erro ao sincronizar" });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    await supabase.from("tiktok_connections" as any).delete().eq("user_id", user?.id);
    setConnection(null);
    setVideos([]);
    toast({ title: "TikTok desconectado" });
  };

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-6 text-center">
        <Video className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Faça login para conectar</h2>
        <Button asChild className="bg-gradient-primary">
          <a href="/auth">Entrar</a>
        </Button>
      </div>
    );
  }

  // Not connected state
  if (!connection) {
    return (
      <div className="space-y-6 pb-20">
        <div>
          <h1 className="text-2xl font-bold">TikTok</h1>
          <p className="text-sm text-muted-foreground">Conecte sua conta para métricas e publicação</p>
        </div>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-[#ff0050] via-[#00f2ea] to-[#000] p-6 text-white text-center">
            <div className="h-20 w-20 mx-auto rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" className="h-10 w-10 fill-white">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.72a8.27 8.27 0 0 0 4.85 1.56V6.84a4.85 4.85 0 0 1-1.09-.15z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Conectar TikTok</h2>
            <p className="text-sm text-white/80 mb-6 max-w-xs mx-auto">
              Importe suas métricas, publique conteúdo e rastreie vendas do TikTok Shop
            </p>
            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="bg-white text-black hover:bg-white/90 font-semibold px-8"
            >
              {connecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Conectar com TikTok
            </Button>
          </div>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3 text-center text-sm">
              <div className="p-3 rounded-xl bg-muted">
                <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="font-medium">Métricas</p>
                <p className="text-xs text-muted-foreground">Seguidores, views</p>
              </div>
              <div className="p-3 rounded-xl bg-muted">
                <Video className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="font-medium">Publicar</p>
                <p className="text-xs text-muted-foreground">Postar direto</p>
              </div>
              <div className="p-3 rounded-xl bg-muted">
                <Link2 className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="font-medium">Afiliados</p>
                <p className="text-xs text-muted-foreground">Rastrear vendas</p>
              </div>
              <div className="p-3 rounded-xl bg-muted">
                <Eye className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="font-medium">Analytics</p>
                <p className="text-xs text-muted-foreground">Performance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Connected state
  return (
    <div className="space-y-6 pb-20">
      {/* Profile Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {connection.avatar_url ? (
            <img src={connection.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Video className="h-6 w-6 text-primary" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">{connection.display_name || "TikTok"}</h1>
              {connection.is_verified && <CheckCircle2 className="h-4 w-4 text-[#20D5EC]" />}
            </div>
            <p className="text-sm text-muted-foreground">@{connection.tiktok_username}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={handleDisconnect}>
            <Unplug className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Seguidores", value: connection.followers_count, icon: Users },
          { label: "Seguindo", value: connection.following_count, icon: Users },
          { label: "Curtidas", value: connection.likes_count, icon: Heart },
          { label: "Vídeos", value: connection.video_count, icon: Video },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-3 text-center">
              <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{formatNumber(value)}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {connection.last_synced_at && (
        <p className="text-xs text-muted-foreground text-center">
          Atualizado {formatDistanceToNow(new Date(connection.last_synced_at), { addSuffix: true, locale: ptBR })}
        </p>
      )}

      {/* Tabs */}
      <Tabs defaultValue="videos" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="videos" className="flex-1">Vídeos</TabsTrigger>
          <TabsTrigger value="shop" className="flex-1">Shop</TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="mt-4 space-y-3">
          {videos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Clique em sincronizar para carregar seus vídeos</p>
                <Button onClick={handleSync} disabled={syncing} variant="outline" className="gap-2">
                  <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
                  Sincronizar
                </Button>
              </CardContent>
            </Card>
          ) : (
            videos.map((video) => (
              <Card key={video.id}>
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    {video.cover_image_url && (
                      <img
                        src={video.cover_image_url}
                        alt=""
                        className="h-20 w-14 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{video.video_description || video.title || "Sem título"}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {formatNumber(video.view_count)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" /> {formatNumber(video.like_count)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" /> {formatNumber(video.comment_count)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Share2 className="h-3 w-3" /> {formatNumber(video.share_count)}
                        </span>
                      </div>
                      <a
                        href={video.share_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary mt-2"
                      >
                        Ver no TikTok <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="shop" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center">
              <svg viewBox="0 0 24 24" className="h-12 w-12 mx-auto fill-muted-foreground mb-4">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.72a8.27 8.27 0 0 0 4.85 1.56V6.84a4.85 4.85 0 0 1-1.09-.15z" />
              </svg>
              <p className="font-medium mb-1">TikTok Shop</p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Configure sua conta de desenvolvedor TikTok com permissões de Shop para desbloquear rastreamento de vendas
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
