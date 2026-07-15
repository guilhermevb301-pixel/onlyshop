import { useState, useEffect, useMemo, useRef } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Camera, Edit3, Calendar, Loader2, Wallet, Send, Megaphone, MapPin,
  CheckCircle, Clock, Hourglass, CircleDollarSign, ExternalLink, ArrowRight,
  PlusCircle, TrendingUp, Sparkles, Store,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useMyLevel } from "@/hooks/useMyLevel";
import { LevelBadge } from "@/components/gamification/LevelBadge";
import { PublicPageCard } from "@/components/profile/PublicPageCard";
import { SocialLinksCard } from "@/components/profile/SocialLinksCard";
import { IntroVideoCard } from "@/components/profile/IntroVideoCard";
import { CampaignDeliverySheet } from "@/components/campaigns/CampaignDeliverySheet";
import {
  demo, computeSplit, computeBudget,
  type CampaignApplication, type Campaign,
} from "@/lib/campaigns";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

// Status visíveis no histórico do influencer (fora applied/rejected).
const VISIBLE_APP = ["accepted", "delivered", "approved", "paid"] as const;

// Aparência de cada status na timeline.
const STATUS_CFG: Record<string, { label: string; icon: typeof Clock; class: string }> = {
  accepted: { label: "Aguardando entrega", icon: Hourglass, class: "bg-warning/15 text-warning" },
  delivered: { label: "Em análise", icon: Clock, class: "bg-accent/15 text-accent" },
  approved: { label: "Aprovado", icon: CheckCircle, class: "bg-primary/15 text-primary" },
  paid: { label: "Pago", icon: CircleDollarSign, class: "bg-accent/20 text-accent" },
};
const CAMPAIGN_CFG: Record<string, { label: string; class: string }> = {
  active: { label: "Ativa", class: "bg-accent/15 text-accent" },
  draft: { label: "Rascunho", class: "bg-muted/40 text-muted-foreground/70" },
  paused: { label: "Pausada", class: "bg-warning/15 text-warning" },
  completed: { label: "Concluída", class: "bg-primary/15 text-primary" },
};

// Métricas REAIS do MVP (demo: localStorage; real: Supabase). Sem tabelas sociais.
type Metrics = {
  // affiliate
  balance: number;
  deliveries: number;
  campaignsTaken: number;
  apps: CampaignApplication[];
  credits: { kind: string; amount: number; created_at: string; status: string }[];
  // brand
  myCampaigns: Campaign[];
  invested: number;
};

const EMPTY_METRICS: Metrics = {
  balance: 0, deliveries: 0, campaignsTaken: 0, apps: [], credits: [],
  myCampaigns: [], invested: 0,
};

export default function Profile() {
  const { user, profile, userRole, loading, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const role = userRole?.role || "viewer";
  const isBrand = role === "brand";
  const isViewer = role === "viewer";
  const { totalXp: myXp } = useMyLevel();

  useEffect(() => {
    if (user) fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setUsername(profile.username || "");
      setBio(profile.bio || "");
    }
  }, [profile]);

  // Métricas reais do produto — NUNCA mais posts/follows.
  const fetchMetrics = async () => {
    if (!user) return;
    setMetricsLoading(true);
    try {
      if (demo.isOn()) {
        // Demo é single-user → lê tudo do localStorage do MVP (sem uid pra casar com a seed).
        const apps = demo.apps().filter((a) => VISIBLE_APP.includes(a.status as any));
        const credits = demo.credits();
        const myCampaigns = demo.myCampaigns();
        setMetrics({
          balance: demo.balance(),
          deliveries: apps.filter((a) => a.status !== "accepted").length,
          campaignsTaken: apps.length,
          apps,
          credits,
          myCampaigns,
          invested: myCampaigns.reduce(
            (s, c) => s + computeBudget(c.slots, c.reward_amount).total, 0,
          ),
        });
        return;
      }

      // Real: campaign_applications + platform_credits + campaigns (sem posts/follows).
      const [appsRes, creditsRes, campsRes] = await Promise.all([
        supabase
          .from("campaign_applications" as any)
          .select("*")
          .eq("influencer_user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("platform_credits" as any)
          .select("kind, amount, created_at, status")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("campaigns" as any)
          .select("*")
          .eq("brand_id", user.id),
      ]);

      const apps = ((appsRes.data as unknown as CampaignApplication[]) || [])
        .filter((a) => VISIBLE_APP.includes(a.status as any));
      const credits = ((creditsRes.data as any[]) || []);
      const myCampaigns = ((campsRes.data as unknown as Campaign[]) || []);

      setMetrics({
        balance: credits.reduce((s, c) => s + Number(c.amount || 0), 0),
        deliveries: apps.filter((a) => a.status !== "accepted").length,
        campaignsTaken: apps.length,
        apps,
        credits,
        myCampaigns,
        invested: myCampaigns.reduce(
          (s, c) => s + computeBudget(c.slots, c.reward_amount).total, 0,
        ),
      });
    } catch (e) {
      console.error("Erro ao carregar métricas:", e);
      setMetrics(EMPTY_METRICS);
    } finally {
      setMetricsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Arquivo muito grande", description: "Máximo 5MB" });
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = `${publicUrl}?t=${Date.now()}`;
      await updateProfile({ avatar_url: avatarUrl } as any);
      toast({ title: "Avatar atualizado!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro no upload", description: error.message });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // ---- Loading: skeleton espelha o card real (não um spinner cru) -------------
  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="rounded-[1.75rem] bg-gradient-to-b from-white/[0.06] to-transparent p-px">
          <div className="rounded-[calc(1.75rem-1px)] bg-card/60 overflow-hidden">
            <div className="h-28 bg-muted/20 animate-pulse" />
            <div className="px-4 pb-5 -mt-10">
              <div className="h-20 w-20 rounded-full bg-muted/30 ring-4 ring-card animate-pulse" />
              <div className="mt-4 h-5 w-40 rounded-lg bg-muted/25 animate-pulse" />
              <div className="mt-2 h-3 w-24 rounded bg-muted/20 animate-pulse" />
              <div className="mt-5 grid grid-cols-3 gap-2.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-[1.1rem] bg-muted/20 animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const handleSave = async () => {
    setIsSaving(true);
    try { await updateProfile({ display_name: displayName, username, bio }); setIsEditing(false); }
    catch { /* useAuth já mostra o toast de erro */ }
    finally { setIsSaving(false); }
  };

  // Fallbacks com identidade (email > 'Usuário' literal).
  const emailHandle = user.email?.split("@")[0] || "usuario";
  const nameOut = profile?.display_name?.trim() || emailHandle;
  const userOut = profile?.username?.trim() || emailHandle;
  const initials =
    profile?.display_name?.trim()?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    || user.email?.[0].toUpperCase() || "U";

  const roleLabels: Record<string, string> = {
    affiliate: "Influencer",
    brand: "Lojista",
  };

  // Stats por papel — número herói (cyan = dinheiro), label eyebrow.
  const stats: { label: string; value: string; to: string; money?: boolean }[] = isBrand
    ? [
        { label: "Campanhas", value: String(metrics.myCampaigns.length), to: "/brands" },
        { label: "Ativas", value: String(metrics.myCampaigns.filter((c) => c.status === "active").length), to: "/brands" },
        { label: "Investido", value: fmt(metrics.invested), to: "/brands", money: true },
      ]
    : [
        { label: "Saldo", value: fmt(metrics.balance), to: "/wallet", money: true },
        { label: "Entregas", value: String(metrics.deliveries), to: "/affiliate" },
        { label: "Aceitas", value: String(metrics.campaignsTaken), to: "/affiliate" },
      ];

  return (
    <div className="max-w-lg mx-auto py-6 space-y-5">
      {/* Hidden file input */}
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

      {/* ===== Profile Card — double-bezel ===== */}
      <div className="mx-4 animate-fade-in">
        <div className="rounded-[1.75rem] bg-gradient-to-b from-white/[0.09] to-transparent p-[1.5px] shadow-[0_24px_80px_-40px_hsl(346_100%_58%/0.3)]">
          <div className="rounded-[calc(1.75rem-1.5px)] overflow-hidden bg-card/80 backdrop-blur-xl border border-white/[0.04]">
            {/* Cover */}
            <div className="h-28 relative overflow-hidden bg-gradient-to-br from-primary/20 via-accent/10 to-transparent">
              <div className="absolute -top-8 right-6 w-40 h-40 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/60" />
            </div>

            <div className="px-4 pb-5 relative">
              {/* Avatar */}
              <div className="absolute -top-10 left-4">
                <div className="relative">
                  <div className="rounded-full p-[2px] bg-gradient-to-br from-accent via-primary to-purple-500">
                    <Avatar className="h-20 w-20 border-[3px] border-card">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={nameOut} />
                      <AvatarFallback className="bg-muted text-foreground text-lg font-bold">{initials}</AvatarFallback>
                    </Avatar>
                  </div>
                  <button
                    type="button"
                    aria-label="Trocar foto de perfil"
                    className="absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-primary text-white shadow-lg shadow-primary/30 active:scale-90 transition-transform ease-[cubic-bezier(.32,.72,0,1)]">
                      {isUploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                </div>
              </div>

              {/* Edit */}
              <div className="flex justify-end pt-3">
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-9 px-4 text-xs rounded-full" onClick={() => setIsEditing(false)}>Cancelar</Button>
                    <Button
                      size="sm"
                      className="group h-9 px-4 text-xs rounded-full bg-gradient-primary text-white border-0 gap-1.5 active:scale-[.98] transition-all ease-[cubic-bezier(.32,.72,0,1)]"
                      onClick={handleSave}
                      disabled={isSaving}
                      aria-busy={isSaving}
                    >
                      {isSaving
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span className="sr-only">Salvando…</span></>
                        : "Salvar"}
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="h-9 px-4 text-xs rounded-full border-border/40 gap-1.5 active:scale-[.98] transition-transform ease-[cubic-bezier(.32,.72,0,1)]" onClick={() => setIsEditing(true)}>
                    <Edit3 className="h-3.5 w-3.5" />Editar
                  </Button>
                )}
              </div>

              {/* Info */}
              <div className="mt-6 space-y-2">
                {isEditing ? (
                  <div className="space-y-3">
                    <div><Label className="text-xs text-muted-foreground/70">Nome</Label><Input className="h-11 text-sm rounded-xl mt-1 border-border/30" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
                    <div><Label className="text-xs text-muted-foreground/70">Usuário</Label><Input className="h-11 text-sm rounded-xl mt-1 border-border/30" value={username} onChange={(e) => setUsername(e.target.value)} /></div>
                    <div><Label className="text-xs text-muted-foreground/70">Bio</Label><Textarea className="text-sm rounded-xl resize-none mt-1 border-border/30" rows={2} value={bio} onChange={(e) => setBio(e.target.value)} /></div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-lg font-black tracking-tight">{nameOut}</h1>
                      {isViewer ? (
                        <Link
                          to="/onboarding"
                          className="text-[10px] font-semibold uppercase tracking-wider rounded-full bg-primary/15 text-primary px-2.5 py-1 hover:bg-primary/25 transition-colors"
                        >
                          Escolher papel
                        </Link>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] font-semibold rounded-full bg-primary/15 text-primary border-0 px-2.5">
                          {roleLabels[role]}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground/70">@{userOut}</p>
                    {isViewer ? (
                      <p className="text-xs text-muted-foreground/60">Complete seu perfil pra começar a faturar.</p>
                    ) : profile?.bio ? (
                      <p className="text-sm leading-relaxed text-foreground/80">{profile.bio}</p>
                    ) : null}
                    {!isBrand && !isViewer && (
                      <div className="pt-0.5"><LevelBadge totalXp={myXp} showBar /></div>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
                      <Calendar className="h-3 w-3" />
                      Entrou {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: ptBR })}
                    </div>
                  </>
                )}
              </div>

              {/* Stats — métricas reais do MVP, clicáveis, dinheiro em cyan */}
              {!isEditing && (
                <>
                  <div className="grid grid-cols-3 gap-2.5 mt-5">
                    {stats.map((s, i) => (
                      <Link
                        key={s.label}
                        to={s.to}
                        className="group rounded-[1.1rem] bg-gradient-to-b from-white/[0.05] to-transparent p-px active:scale-[.97] transition-transform ease-[cubic-bezier(.32,.72,0,1)] animate-fade-in"
                        style={{ animationDelay: `${80 + i * 50}ms`, animationFillMode: "both" }}
                      >
                        <div className="rounded-[calc(1.1rem-1px)] bg-card/60 backdrop-blur px-2 py-3 text-center shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.04)] group-hover:bg-card/80 transition-colors">
                          <p className={cn(
                            "text-base font-black tabular-nums leading-tight truncate",
                            s.money ? "text-accent" : "text-foreground",
                          )}>
                            {metricsLoading ? <span className="inline-block h-4 w-10 rounded bg-muted/30 animate-pulse align-middle" /> : s.value}
                          </p>
                          <span className="mt-1 block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60">{s.label}</span>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* CTA primário por papel */}
                  <ProfilePrimaryCta isBrand={isBrand} isViewer={isViewer} balance={metrics.balance} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Sua página pública (linktree): link + editar redes/vídeo inline ===== */}
      {!isBrand && !isViewer && (
        <div className="px-4 space-y-5">
          <PublicPageCard />
          <SocialLinksCard />
          <IntroVideoCard />
        </div>
      )}

      {/* ===== Histórico do MVP (sem Posts/Curtidas/Salvos) ===== */}
      {!isViewer && (
        <div className="px-4">
          {isBrand ? (
            <BrandHistory metrics={metrics} loading={metricsLoading} />
          ) : (
            <AffiliateHistory metrics={metrics} loading={metricsLoading} />
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CTA primário por papel
// =============================================================================
function ProfilePrimaryCta({ isBrand, isViewer, balance }: { isBrand: boolean; isViewer: boolean; balance: number }) {
  if (isViewer) return null;

  if (isBrand) {
    return (
      <Button
        asChild
        className="group mt-4 w-full rounded-full h-12 gap-2 bg-gradient-primary text-white border-0 shadow-[0_8px_28px_-8px_hsl(346_100%_58%/0.5)] active:scale-[.98] transition-all ease-[cubic-bezier(.32,.72,0,1)]"
      >
        <Link to="/checkout">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
            <PlusCircle className="h-3.5 w-3.5" />
          </span>
          Adicionar crédito
          <ArrowRight className="h-4 w-4 ml-auto transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)] group-hover:translate-x-0.5" />
        </Link>
      </Button>
    );
  }

  // affiliate
  return balance > 0 ? (
    <Button
      asChild
      className="group mt-4 w-full rounded-full h-12 gap-2 bg-gradient-primary text-white border-0 shadow-[0_8px_28px_-8px_hsl(346_100%_58%/0.5)] active:scale-[.98] transition-all ease-[cubic-bezier(.32,.72,0,1)]"
    >
      <Link to="/wallet">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
          <Wallet className="h-3.5 w-3.5" />
        </span>
        Sacar {fmt(balance)}
        <ArrowRight className="h-4 w-4 ml-auto transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)] group-hover:translate-x-0.5" />
      </Link>
    </Button>
  ) : (
    <Button
      asChild
      variant="outline"
      className="group mt-4 w-full rounded-full h-12 gap-2 border-border/40 active:scale-[.98] transition-all ease-[cubic-bezier(.32,.72,0,1)]"
    >
      <Link to="/mapa">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
          <MapPin className="h-3.5 w-3.5" />
        </span>
        Ver campanhas perto de você
        <ArrowRight className="h-4 w-4 ml-auto transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)] group-hover:translate-x-0.5" />
      </Link>
    </Button>
  );
}

// =============================================================================
// Histórico do influencer: Entregas + Ganhos
// =============================================================================
function AffiliateHistory({ metrics, loading }: { metrics: Metrics; loading: boolean }) {
  const ledger = useMemo(
    () => metrics.credits.filter((c) => c.kind === "payout" || c.kind === "withdrawal"),
    [metrics.credits],
  );
  const [selected, setSelected] = useState<CampaignApplication | null>(null);

  return (
    <>
    <Tabs defaultValue="entregas" className="w-full">
      <TabsList className="w-full grid grid-cols-2 h-11 p-1 bg-muted/30 rounded-full border-0">
        {([["entregas", Send, "Minhas entregas"], ["ganhos", TrendingUp, "Ganhos"]] as const).map(([val, Icon, label]) => (
          <TabsTrigger key={val} value={val} className="gap-1.5 text-xs font-semibold h-9 rounded-full data-[state=active]:shadow-none data-[state=active]:bg-card">
            <Icon className="h-3.5 w-3.5" />{label}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Entregas */}
      <TabsContent value="entregas" className="mt-3">
        {loading ? (
          <HistorySkeleton />
        ) : metrics.apps.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="Nenhuma entrega ainda"
            text="Encontre marcas perto de você, grave o vídeo e receba por entrega."
            ctaTo="/mapa"
            ctaLabel="Abrir mapa"
          />
        ) : (
          <ul className="space-y-2.5">
            {metrics.apps.map((a, i) => {
              const cfg = STATUS_CFG[a.status] ?? STATUS_CFG.accepted;
              const StatusIcon = cfg.icon;
              const net = computeSplit(a.campaign?.reward_amount || 0).influencer;
              return (
                <li key={a.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}>
                  <button
                    type="button"
                    onClick={() => setSelected(a)}
                    className="w-full text-left rounded-[1.35rem] bg-gradient-to-b from-border/30 to-transparent p-px transition-all duration-300 ease-[cubic-bezier(.32,.72,0,1)] hover:from-primary/30 active:scale-[.99]"
                  >
                    <div className="rounded-[calc(1.35rem-1px)] bg-card/70 backdrop-blur p-3.5 shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.04)]">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/30 to-accent/15 flex items-center justify-center shrink-0 ring-1 ring-white/[0.06]">
                          <span className="text-sm font-bold">{a.campaign?.brand_name?.[0] ?? "?"}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold leading-tight truncate">{a.campaign?.title ?? "Campanha"}</p>
                          <p className="text-[11px] text-muted-foreground/60 truncate">{a.campaign?.brand_name}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground/55">
                            {a.distance_km != null && (
                              <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5 text-accent" />{a.distance_km} km</span>
                            )}
                            <span>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant="secondary" className={cn("text-[10px] rounded-full border-0 gap-1 px-2.5 py-1 font-semibold", cfg.class)}>
                            <StatusIcon className="h-2.5 w-2.5" />{cfg.label}
                          </Badge>
                          <span className="text-xs font-black tabular-nums text-accent">{fmt(net)}</span>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center gap-1 text-[11px] text-muted-foreground/45">
                        <ExternalLink className="h-3 w-3" /> Toque para ver o detalhe {a.posted_at ? "e a data" : ""}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </TabsContent>

      {/* Ganhos (ledger) */}
      <TabsContent value="ganhos" className="mt-3">
        {loading ? (
          <HistorySkeleton />
        ) : ledger.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Seu primeiro ganho aparece aqui"
            text="Cada entrega aprovada cai como crédito. É só sacar via PIX."
            ctaTo="/mapa"
            ctaLabel="Ver campanhas"
          />
        ) : (
          <ul className="space-y-2.5">
            {ledger.map((c, i) => {
              const isOut = c.amount < 0 || c.kind === "withdrawal";
              return (
                <li
                  key={`${c.created_at}-${i}`}
                  className="animate-fade-in flex items-center gap-3 rounded-[1.25rem] bg-card/60 ring-1 ring-white/[0.05] backdrop-blur px-3.5 py-3"
                  style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                >
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-full shrink-0", isOut ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent")}>
                    {isOut ? <Wallet className="h-4 w-4" /> : <CircleDollarSign className="h-4 w-4" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-tight">{isOut ? "Saque PIX" : "Pagamento de entrega"}</p>
                    <p className="text-[11px] text-muted-foreground/55">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}</p>
                  </div>
                  <span className={cn("text-sm font-black tabular-nums shrink-0", isOut ? "text-muted-foreground/70" : "text-accent")}>
                    {isOut ? "-" : "+"}{fmt(Math.abs(c.amount))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </TabsContent>
    </Tabs>
    <CampaignDeliverySheet application={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </>
  );
}

// =============================================================================
// Histórico do lojista: Minhas campanhas + Gastos
// =============================================================================
function BrandHistory({ metrics, loading }: { metrics: Metrics; loading: boolean }) {
  return (
    <Tabs defaultValue="campanhas" className="w-full">
      <TabsList className="w-full grid grid-cols-2 h-11 p-1 bg-muted/30 rounded-full border-0">
        {([["campanhas", Megaphone, "Minhas campanhas"], ["gastos", CircleDollarSign, "Gastos"]] as const).map(([val, Icon, label]) => (
          <TabsTrigger key={val} value={val} className="gap-1.5 text-xs font-semibold h-9 rounded-full data-[state=active]:shadow-none data-[state=active]:bg-card">
            <Icon className="h-3.5 w-3.5" />{label}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Campanhas */}
      <TabsContent value="campanhas" className="mt-3">
        {loading ? (
          <HistorySkeleton />
        ) : metrics.myCampaigns.length === 0 ? (
          <EmptyState
            icon={Store}
            title="Você ainda não criou campanhas"
            text="Publique uma vaga, defina o reward e os influencers perto de você aparecem."
            ctaTo="/brands"
            ctaLabel="Criar campanha"
          />
        ) : (
          <ul className="space-y-2.5">
            {metrics.myCampaigns.map((c, i) => {
              const cfg = CAMPAIGN_CFG[c.status] ?? CAMPAIGN_CFG.active;
              const left = Math.max(0, c.slots - c.slots_filled);
              const total = computeBudget(c.slots, c.reward_amount).total;
              return (
                <li key={c.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}>
                  <div className="rounded-[1.35rem] bg-gradient-to-b from-border/30 to-transparent p-px transition-all duration-300 ease-[cubic-bezier(.32,.72,0,1)] hover:from-primary/30 active:scale-[.99]">
                    <div className="rounded-[calc(1.35rem-1px)] bg-card/70 backdrop-blur p-3.5 shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.04)]">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/30 to-accent/15 flex items-center justify-center shrink-0 ring-1 ring-white/[0.06]">
                          <Megaphone className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold leading-tight truncate">{c.name}</p>
                          <div className="flex items-center gap-2.5 mt-1 text-[10px] text-muted-foreground/55">
                            <span>{left} vaga{left !== 1 ? "s" : ""} restante{left !== 1 ? "s" : ""}</span>
                            <span className="text-accent font-semibold">{fmt(c.reward_amount)}/vídeo</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant="secondary" className={cn("text-[10px] rounded-full border-0 px-2.5 py-1 font-semibold", cfg.class)}>{cfg.label}</Badge>
                          <span className="text-xs font-black tabular-nums text-accent">{fmt(total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </TabsContent>

      {/* Gastos */}
      <TabsContent value="gastos" className="mt-3">
        {loading ? (
          <HistorySkeleton />
        ) : metrics.myCampaigns.length === 0 ? (
          <EmptyState
            icon={CircleDollarSign}
            title="Nenhum gasto ainda"
            text="Quando você financiar uma campanha, o investimento aparece aqui."
            ctaTo="/brands"
            ctaLabel="Criar campanha"
          />
        ) : (
          <>
            <div className="rounded-[1.5rem] bg-gradient-to-b from-accent/20 via-primary/10 to-transparent p-px animate-fade-in">
              <div className="rounded-[calc(1.5rem-1px)] bg-card/70 backdrop-blur p-5">
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground/60">Total investido</span>
                <p className="text-3xl font-black tabular-nums text-accent mt-1">{fmt(metrics.invested)}</p>
                <p className="text-[11px] text-muted-foreground/55 mt-1">Reward das vagas + 20% de taxa Only Shop</p>
              </div>
            </div>
            <ul className="space-y-2.5 mt-3">
              {metrics.myCampaigns.map((c, i) => {
                const { base, fee, total } = computeBudget(c.slots, c.reward_amount);
                return (
                  <li
                    key={c.id}
                    className="animate-fade-in flex items-center gap-3 rounded-[1.25rem] bg-card/60 ring-1 ring-white/[0.05] backdrop-blur px-3.5 py-3"
                    style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold leading-tight truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground/55">{fmt(base)} reward + {fmt(fee)} taxa</p>
                    </div>
                    <span className="text-sm font-black tabular-nums text-accent shrink-0">{fmt(total)}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}

// =============================================================================
// Empty state premium (ícone em círculo + CTA com ícone aninhado)
// =============================================================================
function EmptyState({
  icon: Icon, title, text, ctaTo, ctaLabel,
}: { icon: typeof MapPin; title: string; text: string; ctaTo: string; ctaLabel: string }) {
  return (
    <div className="animate-fade-in rounded-[1.5rem] border border-dashed border-border/40 bg-card/30 py-12 px-6 text-center">
      <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <p className="mt-4 text-base font-bold">{title}</p>
      <p className="mx-auto mt-1.5 max-w-xs text-xs text-muted-foreground/60 leading-relaxed">{text}</p>
      <Button
        asChild
        className="group mt-5 rounded-full h-11 gap-2 bg-gradient-primary text-white border-0 shadow-[0_8px_28px_-8px_hsl(346_100%_58%/0.5)] active:scale-[.98] transition-all ease-[cubic-bezier(.32,.72,0,1)]"
      >
        <Link to={ctaTo}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
            <Icon className="h-3.5 w-3.5" />
          </span>
          {ctaLabel}
          <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(.32,.72,0,1)] group-hover:translate-x-0.5" />
        </Link>
      </Button>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-20 rounded-[1.35rem] bg-muted/20 animate-pulse" />
      ))}
    </div>
  );
}
