import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users, CreditCard, Flag, BarChart3, Loader2, Search, Shield,
  Crown, TrendingUp, DollarSign, MessageSquare, Heart,
  ChevronLeft, ChevronRight, Download, Package, Video,
  PlayCircle, Save, Clock, Type, MousePointer2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";

interface UserWithRole {
  id: string; user_id: string; username: string | null; display_name: string | null;
  avatar_url: string | null; created_at: string; role: string;
}

interface FeatureFlag {
  id: string; key: string; name: string; description: string | null; enabled: boolean; updated_at: string;
}

interface PlatformStats {
  totalUsers: number; totalPosts: number; totalCommunities: number;
  totalAffiliateLinks: number; activeSubscriptions: number;
  totalLikes: number; totalComments: number; totalProducts: number;
  totalOrders: number;
}

const USERS_PER_PAGE = 15;

export default function Admin() {
  const { user, userRole, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Users state
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Feature flags
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [flagsLoading, setFlagsLoading] = useState(true);

  // Plans
  const [plans, setPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Growth chart data
  const [growthData, setGrowthData] = useState<any[]>([]);

  // VSL settings
  const [vslSettings, setVslSettings] = useState<any>(null);
  const [vslLoading, setVslLoading] = useState(true);
  const [vslAnalytics, setVslAnalytics] = useState<any[]>([]);

  // Role change confirmation
  const [roleChangeDialog, setRoleChangeDialog] = useState<{ userId: string; newRole: string; displayName: string } | null>(null);

  useEffect(() => {
    if (userRole?.role === "admin") {
      fetchUsers();
      fetchFeatureFlags();
      fetchPlans();
      fetchStats();
      fetchGrowthData();
      fetchVSLSettings();
      fetchVSLAnalytics();
    }
  }, [userRole]);

  const fetchVSLSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("vsl_settings")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      setVslSettings(data || {
        headline: "",
        subheadline: "",
        video_url: "",
        cta_text: "Quero Começar Agora",
        cta_delay_seconds: 0,
        autoplay: true
      });
    } catch (error) {
      console.error("Error fetching VSL settings:", error);
    } finally {
      setVslLoading(false);
    }
  };

  const fetchVSLAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from("vsl_analytics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setVslAnalytics(data || []);
    } catch (error) {
      console.error("Error fetching VSL analytics:", error);
    }
  };

  const handleSaveVSL = async () => {
    try {
      setVslLoading(true);
      const { id, created_at, updated_at, ...settingsToSave } = vslSettings;
      
      let error;
      if (id) {
        ({ error } = await supabase
          .from("vsl_settings")
          .update(settingsToSave)
          .eq("id", id));
      } else {
        ({ error } = await supabase
          .from("vsl_settings")
          .insert([settingsToSave]));
      }

      if (error) throw error;
      toast({ title: "Configurações da VSL salvas!" });
      fetchVSLSettings();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
    } finally {
      setVslLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles").select("*").order("created_at", { ascending: false });
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles").select("user_id, role");
      if (rolesError) throw rolesError;

      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      const usersWithRoles: UserWithRole[] = (profiles || []).map(p => ({
        id: p.id, user_id: p.user_id, username: p.username, display_name: p.display_name,
        avatar_url: p.avatar_url, created_at: p.created_at, role: rolesMap.get(p.user_id) || "viewer"
      }));
      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error("Error fetching users:", error);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchFeatureFlags = async () => {
    try {
      const { data, error } = await supabase.from("feature_flags").select("*").order("name");
      if (error) throw error;
      setFeatureFlags((data as FeatureFlag[]) || []);
    } catch (error: any) { console.error(error); } finally { setFlagsLoading(false); }
  };

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase.from("subscription_plans").select("*").order("tier");
      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) { console.error(error); } finally { setPlansLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const [u, p, c, l, s, lk, cm, pr, o] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("communities").select("*", { count: "exact", head: true }),
        supabase.from("affiliate_links").select("*", { count: "exact", head: true }),
        supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("likes").select("*", { count: "exact", head: true }),
        supabase.from("comments").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
      ]);
      setStats({
        totalUsers: u.count || 0, totalPosts: p.count || 0, totalCommunities: c.count || 0,
        totalAffiliateLinks: l.count || 0, activeSubscriptions: s.count || 0,
        totalLikes: lk.count || 0, totalComments: cm.count || 0,
        totalProducts: pr.count || 0, totalOrders: o.count || 0,
      });
    } catch (error: any) { console.error(error); } finally { setStatsLoading(false); }
  };

  const fetchGrowthData = async () => {
    try {
      // Get profiles with created_at for user growth chart (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: profiles } = await supabase
        .from("profiles").select("created_at").gte("created_at", thirtyDaysAgo).order("created_at");

      const { data: posts } = await supabase
        .from("posts").select("created_at").gte("created_at", thirtyDaysAgo).order("created_at");

      // Group by day
      const dayMap = new Map<string, { users: number; posts: number }>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split("T")[0];
        dayMap.set(key, { users: 0, posts: 0 });
      }

      profiles?.forEach(p => {
        const key = p.created_at.split("T")[0];
        const entry = dayMap.get(key);
        if (entry) entry.users++;
      });

      posts?.forEach(p => {
        const key = p.created_at.split("T")[0];
        const entry = dayMap.get(key);
        if (entry) entry.posts++;
      });

      const chartData = [...dayMap.entries()].map(([date, data]) => ({
        date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        users: data.users,
        posts: data.posts,
      }));

      setGrowthData(chartData);
    } catch (e) { console.error(e); }
  };

  const handleToggleFlag = async (flagId: string, currentValue: boolean) => {
    try {
      const { error } = await supabase.from("feature_flags").update({ enabled: !currentValue }).eq("id", flagId);
      if (error) throw error;
      setFeatureFlags(prev => prev.map(f => f.id === flagId ? { ...f, enabled: !currentValue } : f));
      toast({ title: `Feature ${!currentValue ? 'habilitada' : 'desabilitada'}` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const confirmRoleChange = (userId: string, newRole: string, displayName: string) => {
    setRoleChangeDialog({ userId, newRole, displayName });
  };

  const handleUpdateRole = async () => {
    if (!roleChangeDialog) return;
    const { userId, newRole } = roleChangeDialog;
    try {
      const { error } = await supabase.from("user_roles").update({ role: newRole as any }).eq("user_id", userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
      toast({ title: "Role atualizada!", description: `Usuário agora é ${newRole}.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setRoleChangeDialog(null);
    }
  };

  const handleExportCSV = () => {
    const csvHeaders = "Nome,Username,Role,Cadastro\n";
    const csvRows = users.map(u =>
      `"${u.display_name || ''}","${u.username || ''}","${u.role}","${new Date(u.created_at).toLocaleDateString("pt-BR")}"`
    ).join("\n");
    const blob = new Blob([csvHeaders + csvRows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "usuarios.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exportado!" });
  };

  if (authLoading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user || userRole?.role !== "admin") return <Navigate to="/inicio" replace />;

  // Filtering & pagination
  const filteredUsers = users.filter(u => {
    const matchesSearch = searchQuery === "" ||
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * USERS_PER_PAGE, currentPage * USERS_PER_PAGE);

  const getRoleBadge = (role: string) => {
    const config: Record<string, { label: string; className: string }> = {
      admin: { label: "Admin", className: "bg-destructive text-destructive-foreground" },
      brand: { label: "PRO", className: "bg-gradient-primary text-primary-foreground" },
      agency: { label: "Business", className: "bg-primary text-primary-foreground" },
      affiliate: { label: "Partner", className: "bg-accent text-accent-foreground" },
      learner: { label: "Starter", className: "bg-success text-success-foreground" },
      viewer: { label: "Membro", className: "bg-muted text-muted-foreground" },
    };
    const c = config[role] || config.viewer;
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  const statCards = [
    { icon: Users, label: "Usuários", value: stats?.totalUsers || 0 },
    { icon: TrendingUp, label: "Posts", value: stats?.totalPosts || 0 },
    { icon: Users, label: "Comunidades", value: stats?.totalCommunities || 0 },
    { icon: Crown, label: "Assinaturas", value: stats?.activeSubscriptions || 0 },
    { icon: DollarSign, label: "Links Afiliados", value: stats?.totalAffiliateLinks || 0 },
    { icon: Heart, label: "Curtidas", value: stats?.totalLikes || 0 },
    { icon: MessageSquare, label: "Comentários", value: stats?.totalComments || 0 },
    { icon: Package, label: "Produtos", value: stats?.totalProducts || 0 },
    { icon: CreditCard, label: "Pedidos", value: stats?.totalOrders || 0 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Painel Admin</h1>
          <p className="text-sm text-muted-foreground">Gerencie a plataforma Only Shop</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" /><span className="hidden sm:inline">Usuários</span>
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-2">
            <CreditCard className="h-4 w-4" /><span className="hidden sm:inline">Planos</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Flag className="h-4 w-4" /><span className="hidden sm:inline">Features</span>
          </TabsTrigger>
          <TabsTrigger value="vsl" className="gap-2">
            <Video className="h-4 w-4" /><span className="hidden sm:inline">VSL</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          {statsLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {statCards.map(({ icon: Icon, label, value }) => (
                  <Card key={label} className="border-border/30">
                    <CardContent className="p-3 text-center">
                      <Icon className="h-4 w-4 mx-auto text-primary mb-1" />
                      <p className="text-xl font-bold">{value}</p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Growth Chart */}
              {growthData.length > 0 && (
                <Card className="border-border/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Crescimento (30 dias)</CardTitle>
                    <CardDescription className="text-xs">Novos usuários e posts por dia</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={growthData}>
                        <defs>
                          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(330, 81%, 60%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(330, 81%, 60%)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={6} />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
                        <Tooltip
                          contentStyle={{ borderRadius: 12, border: "1px solid hsl(240, 6%, 90%)", fontSize: 12 }}
                          labelStyle={{ fontWeight: "bold" }}
                        />
                        <Area type="monotone" dataKey="users" stroke="hsl(330, 81%, 60%)" fill="url(#colorUsers)" strokeWidth={2} name="Usuários" />
                        <Area type="monotone" dataKey="posts" stroke="hsl(25, 95%, 53%)" fill="url(#colorPosts)" strokeWidth={2} name="Posts" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar usuários..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-9" />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Filtrar role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="learner">Learner</SelectItem>
                <SelectItem value="affiliate">Affiliate</SelectItem>
                <SelectItem value="agency">Agency</SelectItem>
                <SelectItem value="brand">Brand</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
              <Download className="h-4 w-4" />CSV
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">{filteredUsers.length} usuário(s) encontrado(s)</p>

          {/* Mobile: Cards | Desktop: Table */}
          <div className="hidden md:block">
            <Card>
              {usersLoading ? (
                <CardContent className="py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></CardContent>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead className="text-right">Alterar Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum usuário</TableCell></TableRow>
                    ) : paginatedUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex flex-col"><span className="font-medium">{u.display_name || "Sem nome"}</span><span className="text-sm text-muted-foreground">@{u.username || "user"}</span></div>
                        </TableCell>
                        <TableCell>{getRoleBadge(u.role)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{formatDistanceToNow(new Date(u.created_at), { addSuffix: true, locale: ptBR })}</TableCell>
                        <TableCell className="text-right">
                          <Select value={u.role} onValueChange={(value) => confirmRoleChange(u.user_id, value, u.display_name || "Usuário")}>
                            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["viewer","learner","affiliate","agency","brand","admin"].map(r => (
                                <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {usersLoading ? (
              <div className="py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
            ) : paginatedUsers.map((u) => (
              <Card key={u.id} className="border-border/30">
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.display_name || "Sem nome"}</p>
                    <p className="text-[10px] text-muted-foreground">@{u.username || "user"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getRoleBadge(u.role)}
                      <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(u.created_at), { addSuffix: true, locale: ptBR })}</span>
                    </div>
                  </div>
                  <Select value={u.role} onValueChange={(value) => confirmRoleChange(u.user_id, value, u.display_name || "Usuário")}>
                    <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["viewer","learner","affiliate","agency","brand","admin"].map(r => (
                        <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">{currentPage} / {totalPages}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Plans */}
        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Planos de Assinatura</CardTitle>
              <CardDescription>Planos disponíveis na plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              {plansLoading ? (
                <div className="py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
              ) : plans.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhum plano cadastrado</p>
              ) : (
                <div className="space-y-2 md:space-y-0">
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead><TableHead>Slug</TableHead><TableHead>Tier</TableHead><TableHead className="text-right">Preço</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {plans.map((plan) => (
                          <TableRow key={plan.id}>
                            <TableCell className="font-medium">{plan.name}</TableCell>
                            <TableCell className="text-muted-foreground">{plan.slug}</TableCell>
                            <TableCell><Badge variant="outline">Tier {plan.tier}</Badge></TableCell>
                            <TableCell className="text-right font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: plan.currency || 'BRL' }).format(plan.price)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="md:hidden space-y-2">
                    {plans.map((plan) => (
                      <Card key={plan.id} className="border-border/30">
                        <CardContent className="p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{plan.name}</p>
                            <p className="text-[10px] text-muted-foreground">Tier {plan.tier} · {plan.slug}</p>
                          </div>
                          <p className="text-sm font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: plan.currency || 'BRL' }).format(plan.price)}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>Ative ou desative funcionalidades</CardDescription>
            </CardHeader>
            <CardContent>
              {flagsLoading ? (
                <div className="py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
              ) : featureFlags.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhuma feature flag</p>
              ) : (
                <div className="space-y-3">
                  {featureFlags.map((flag) => (
                    <div key={flag.id} className="flex items-center justify-between p-4 rounded-xl border border-border/30 bg-card">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{flag.name}</span>
                          <Badge variant="outline" className="text-[10px]">{flag.key}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{flag.description}</p>
                      </div>
                      <Switch checked={flag.enabled} onCheckedChange={() => handleToggleFlag(flag.id, flag.enabled)} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* VSL Settings */}
        <TabsContent value="vsl" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-primary" />
                  Configurações da VSL
                </CardTitle>
                <CardDescription>Configure sua página de vendas de alta conversão</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Type className="h-4 w-4" /> Headline Principal
                  </label>
                  <Input 
                    value={vslSettings?.headline || ""} 
                    onChange={(e) => setVslSettings({ ...vslSettings, headline: e.target.value })}
                    placeholder="Ex: Como faturar 10k por mês..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subheadline (Opcional)</label>
                  <Input 
                    value={vslSettings?.subheadline || ""} 
                    onChange={(e) => setVslSettings({ ...vslSettings, subheadline: e.target.value })}
                    placeholder="Ex: O método testado por mais de 5.000 pessoas..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Video className="h-4 w-4" /> URL do Vídeo (YouTube, Vimeo, etc)
                  </label>
                  <Input 
                    value={vslSettings?.video_url || ""} 
                    onChange={(e) => setVslSettings({ ...vslSettings, video_url: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Delay CTA (Segundos)
                    </label>
                    <Input 
                      type="number"
                      value={vslSettings?.cta_delay_seconds || 0} 
                      onChange={(e) => setVslSettings({ ...vslSettings, cta_delay_seconds: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <MousePointer2 className="h-4 w-4" /> Texto do Botão
                    </label>
                    <Input 
                      value={vslSettings?.cta_text || ""} 
                      onChange={(e) => setVslSettings({ ...vslSettings, cta_text: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-muted/30">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Autoplay</label>
                    <p className="text-[10px] text-muted-foreground">Inicia o vídeo automaticamente (sem som)</p>
                  </div>
                  <Switch 
                    checked={vslSettings?.autoplay || false} 
                    onCheckedChange={(v) => setVslSettings({ ...vslSettings, autoplay: v })}
                  />
                </div>
                <Button className="w-full gap-2" onClick={handleSaveVSL} disabled={vslLoading}>
                  {vslLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar Alterações
                </Button>
                <Button variant="outline" className="w-full gap-2" asChild>
                  <a href="/vsl" target="_blank">Visualizar Página <Download className="h-4 w-4 rotate-[-90deg]" /></a>
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-border/30">
                <CardHeader>
                  <CardTitle className="text-sm">Métricas Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-border/30 bg-card text-center">
                    <p className="text-2xl font-bold">{vslAnalytics.filter(a => a.event_type === 'view').length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Visualizações</p>
                  </div>
                  <div className="p-4 rounded-xl border border-border/30 bg-card text-center">
                    <p className="text-2xl font-bold">{vslAnalytics.filter(a => a.event_type === 'cta_click').length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Cliques CTA</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/30 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-sm">Log de Eventos Recentes</CardTitle>
                </CardHeader>
                <div className="max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableBody>
                      {vslAnalytics.length === 0 ? (
                        <TableRow><TableCell className="text-center py-8 text-muted-foreground">Sem eventos</TableCell></TableRow>
                      ) : vslAnalytics.map((a) => (
                        <TableRow key={a.id} className="text-[10px]">
                          <TableCell className="font-medium">{a.event_type}</TableCell>
                          <TableCell>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Role change confirmation */}
      <AlertDialog open={!!roleChangeDialog} onOpenChange={(open) => !open && setRoleChangeDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de role</AlertDialogTitle>
            <AlertDialogDescription>
              Alterar <strong>{roleChangeDialog?.displayName}</strong> para <strong>{roleChangeDialog?.newRole}</strong>? Esta ação tem efeito imediato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateRole}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
