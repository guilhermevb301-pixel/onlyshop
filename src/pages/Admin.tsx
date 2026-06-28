import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Users, BarChart3, Loader2, Search, Shield,
  Megaphone, DollarSign, Radio, Layers,
  ChevronLeft, ChevronRight, Download, Store, UserRound,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  demoCampaigns, demo, type CampaignNear,
} from "@/lib/campaigns";

interface UserWithRole {
  id: string; user_id: string; username: string | null; display_name: string | null;
  avatar_url: string | null; created_at: string; role: string;
}

interface MarketStats {
  totalCampaigns: number;   // total de campanhas
  liveCampaigns: number;    // campanhas no ar (funded)
  moneyWaiting: number;     // R$ esperando influencer = soma reward*(slots-slots_filled)
  openSlots: number;        // slots ainda abertos
}

// Linha simplificada de campanha pra visão do admin (real OU demo).
interface CampaignRow {
  id: string;
  name: string;
  brand: string;
  reward: number;
  slots: number;
  filled: number;
  funded: boolean;
  status: string;
}

const USERS_PER_PAGE = 15;

// Papéis do marketplace: lojista (brand) cria campanhas, influencer (affiliate) entrega.
const ROLE_OPTIONS = ["viewer", "affiliate", "brand", "admin"] as const;

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

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

  // Marketplace stats + lista de campanhas
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [isDemo, setIsDemo] = useState(false);

  // Role change confirmation
  const [roleChangeDialog, setRoleChangeDialog] = useState<{ userId: string; newRole: string; displayName: string } | null>(null);

  useEffect(() => {
    if (userRole?.role === "admin") {
      fetchUsers();
      fetchMarketplace();
    }
  }, [userRole]);

  // Deriva métricas + lista a partir de uma coleção de campanhas (real ou demo).
  const buildStats = (rows: CampaignRow[]): MarketStats => {
    const open = (r: CampaignRow) => Math.max(0, (r.slots || 0) - (r.filled || 0));
    return {
      totalCampaigns: rows.length,
      liveCampaigns: rows.filter((r) => r.funded).length,
      moneyWaiting: rows.reduce((s, r) => s + r.reward * open(r), 0),
      openSlots: rows.reduce((s, r) => s + open(r), 0),
    };
  };

  // Fallback demo: campanhas perto + criadas pelo lojista no localStorage.
  const demoRows = (): CampaignRow[] => {
    const near: CampaignRow[] = demoCampaigns().map((c: CampaignNear) => ({
      id: c.campaign_id,
      name: c.title,
      brand: c.brand_name,
      reward: c.reward_amount,
      slots: c.slots,
      filled: c.slots_filled,
      funded: true, // campanhas do feed já entraram no ar
      status: "active",
    }));
    const mine: CampaignRow[] = demo.myCampaigns().map((c) => ({
      id: c.id,
      name: c.name,
      brand: "Minha loja (demo)",
      reward: c.reward_amount,
      slots: c.slots,
      filled: c.slots_filled,
      funded: c.funded,
      status: c.status,
    }));
    return [...mine, ...near];
  };

  const fetchMarketplace = async () => {
    setStatsLoading(true);
    try {
      // Demo: tudo derivado do localStorage + seeds do feed.
      if (demo.isOn()) {
        const rows = demoRows();
        setIsDemo(true);
        setCampaigns(rows);
        setStats(buildStats(rows));
        return;
      }

      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, brand_id, reward_amount, slots, slots_filled, funded, status, brands(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      if (!data || data.length === 0) {
        // Sem campanhas reais ainda → marketplace vazio (nada de exemplos fictícios).
        setIsDemo(false);
        setCampaigns([]);
        setStats(buildStats([]));
        return;
      }

      const rows: CampaignRow[] = data.map((c: any) => ({
        id: c.id,
        name: c.name,
        brand: c.brands?.name || "Loja",
        reward: Number(c.reward_amount) || 0,
        slots: Number(c.slots) || 0,
        filled: Number(c.slots_filled) || 0,
        funded: !!c.funded,
        status: c.status || "draft",
      }));
      setIsDemo(false);
      setCampaigns(rows);
      setStats(buildStats(rows));
    } catch (error) {
      console.error("Error fetching marketplace stats:", error);
      setIsDemo(false);
      setCampaigns([]);
      setStats(buildStats([]));
    } finally {
      setStatsLoading(false);
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
      toast({ title: "Papel atualizado!", description: `Usuário agora é ${roleLabel(newRole)}.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setRoleChangeDialog(null);
    }
  };

  const handleExportCSV = () => {
    const csvHeaders = "Nome,Username,Papel,Cadastro\n";
    const csvRows = users.map(u =>
      `"${u.display_name || ''}","${u.username || ''}","${roleLabel(u.role)}","${new Date(u.created_at).toLocaleDateString("pt-BR")}"`
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

  const statCards = [
    { icon: Megaphone, label: "Campanhas", value: String(stats?.totalCampaigns ?? 0) },
    { icon: Radio, label: "No ar", value: String(stats?.liveCampaigns ?? 0) },
    { icon: DollarSign, label: "Esperando influencer", value: fmtBRL(stats?.moneyWaiting ?? 0) },
    { icon: Layers, label: "Slots abertos", value: String(stats?.openSlots ?? 0) },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Painel do Marketplace</h1>
          <p className="text-sm text-muted-foreground">Campanhas, dinheiro em jogo e usuários do Only Shop</p>
        </div>
        {isDemo && (
          <Badge variant="outline" className="ml-auto text-[10px] border-accent/40 text-accent">
            modo demo
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2">
            <Megaphone className="h-4 w-4" /><span className="hidden sm:inline">Campanhas</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" /><span className="hidden sm:inline">Usuários</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview — métricas do marketplace */}
        <TabsContent value="overview" className="space-y-6">
          {statsLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {statCards.map(({ icon: Icon, label, value }) => (
                  <Card key={label} className="border-border/30">
                    <CardContent className="p-4 text-center">
                      <Icon className="h-5 w-5 mx-auto text-primary mb-1.5" />
                      <p className="text-xl font-bold tabular-nums">{value}</p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Resumo financeiro do marketplace */}
              <Card className="border-border/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Dinheiro no marketplace</CardTitle>
                  <CardDescription className="text-xs">
                    O que está reservado esperando entrega dos influencers (split {" "}
                    {100 - 20}/20).
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl border border-border/30 bg-card text-center">
                    <p className="text-lg font-bold text-accent tabular-nums">{fmtBRL(stats?.moneyWaiting ?? 0)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Esperando influencer</p>
                  </div>
                  <div className="p-4 rounded-xl border border-border/30 bg-card text-center">
                    <p className="text-lg font-bold text-primary tabular-nums">{fmtBRL(demo.isOn() ? demo.balance() : 0)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Saldo (ledger)</p>
                  </div>
                  <div className="p-4 rounded-xl border border-border/30 bg-card text-center">
                    <p className="text-lg font-bold tabular-nums">{stats?.openSlots ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Vagas a preencher</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Campaigns — visão simples */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campanhas do marketplace</CardTitle>
              <CardDescription>
                Todas as campanhas criadas pelos lojistas e quanto ainda está em jogo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
              ) : campaigns.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhuma campanha ainda</p>
              ) : (
                <>
                  {/* Desktop */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campanha</TableHead>
                          <TableHead>Loja</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Vagas</TableHead>
                          <TableHead className="text-right">Recompensa</TableHead>
                          <TableHead className="text-right">Esperando</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaigns.map((c) => {
                          const open = Math.max(0, c.slots - c.filled);
                          return (
                            <TableRow key={c.id}>
                              <TableCell className="font-medium">{c.name}</TableCell>
                              <TableCell className="text-muted-foreground">{c.brand}</TableCell>
                              <TableCell>{statusBadge(c)}</TableCell>
                              <TableCell className="text-center tabular-nums">{c.filled}/{c.slots}</TableCell>
                              <TableCell className="text-right tabular-nums">{fmtBRL(c.reward)}</TableCell>
                              <TableCell className="text-right font-medium text-accent tabular-nums">{fmtBRL(c.reward * open)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile */}
                  <div className="md:hidden space-y-2">
                    {campaigns.map((c) => {
                      const open = Math.max(0, c.slots - c.filled);
                      return (
                        <Card key={c.id} className="border-border/30">
                          <CardContent className="p-3 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium truncate">{c.name}</p>
                              {statusBadge(c)}
                            </div>
                            <p className="text-[10px] text-muted-foreground">{c.brand}</p>
                            <div className="flex items-center justify-between text-[11px] pt-1">
                              <span className="text-muted-foreground tabular-nums">{c.filled}/{c.slots} vagas</span>
                              <span className="tabular-nums">{fmtBRL(c.reward)}/vídeo</span>
                              <span className="font-medium text-accent tabular-nums">{fmtBRL(c.reward * open)}</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar usuários..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-9" />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Filtrar papel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="viewer">Visitante</SelectItem>
                <SelectItem value="affiliate">Influencer</SelectItem>
                <SelectItem value="brand">Lojista</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
              <Download className="h-4 w-4" />CSV
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">{filteredUsers.length} usuário(s) encontrado(s)</p>

          {/* Desktop: Table */}
          <div className="hidden md:block">
            <Card>
              {usersLoading ? (
                <CardContent className="py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></CardContent>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead className="text-right">Alterar papel</TableHead>
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
                            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map(r => (
                                <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>
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
                    <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map(r => (
                        <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>
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
      </Tabs>

      {/* Role change confirmation */}
      <AlertDialog open={!!roleChangeDialog} onOpenChange={(open) => !open && setRoleChangeDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de papel</AlertDialogTitle>
            <AlertDialogDescription>
              Alterar <strong>{roleChangeDialog?.displayName}</strong> para <strong>{roleChangeDialog ? roleLabel(roleChangeDialog.newRole) : ""}</strong>? Esta ação tem efeito imediato.
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

// ---- Helpers de UI ----------------------------------------------------------

// Papéis do marketplace em PT-BR (lojista = brand, influencer = affiliate).
function roleLabel(role: string): string {
  const map: Record<string, string> = {
    admin: "Admin",
    brand: "Lojista",
    affiliate: "Influencer",
    viewer: "Visitante",
    // legados ainda existentes no banco
    agency: "Lojista",
    learner: "Influencer",
  };
  return map[role] || "Visitante";
}

function getRoleBadge(role: string) {
  const config: Record<string, { label: string; className: string; Icon: typeof Store }> = {
    admin: { label: "Admin", className: "bg-destructive text-destructive-foreground", Icon: Shield },
    brand: { label: "Lojista", className: "bg-gradient-primary text-primary-foreground", Icon: Store },
    agency: { label: "Lojista", className: "bg-gradient-primary text-primary-foreground", Icon: Store },
    affiliate: { label: "Influencer", className: "bg-accent text-accent-foreground", Icon: UserRound },
    learner: { label: "Influencer", className: "bg-accent text-accent-foreground", Icon: UserRound },
    viewer: { label: "Visitante", className: "bg-muted text-muted-foreground", Icon: Users },
  };
  const c = config[role] || config.viewer;
  const Icon = c.Icon;
  return <Badge className={`gap-1 ${c.className}`}><Icon className="h-2.5 w-2.5" />{c.label}</Badge>;
}

function statusBadge(c: { funded: boolean; status: string }) {
  if (c.funded) return <Badge className="bg-accent/15 text-accent border-0 text-[10px]">No ar</Badge>;
  if (c.status === "completed") return <Badge variant="secondary" className="text-[10px]">Concluída</Badge>;
  if (c.status === "paused") return <Badge variant="outline" className="text-[10px]">Pausada</Badge>;
  return <Badge variant="outline" className="text-[10px] text-muted-foreground">Rascunho</Badge>;
}
