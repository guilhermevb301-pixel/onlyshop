import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose,
} from "@/components/ui/sheet";
import {
  DollarSign, ArrowDownLeft, ArrowUpRight, Gift, RefreshCw,
  Wallet as WalletIcon, Loader2, CheckCircle, Clock, XCircle, ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { demo, demoId, type CreditKind } from "@/lib/campaigns";

// Rótulo de cada lançamento do ledger de créditos (demo).
const CREDIT_LABEL: Record<CreditKind, string> = {
  topup: "Recarga de crédito",
  campaign_hold: "Reserva de campanha",
  payout: "Pagamento de campanha",
  platform_fee: "Taxa da plataforma",
  refund: "Estorno",
  withdrawal: "Saque PIX",
};

interface WalletTransaction {
  id: string;
  type: "commission" | "withdrawal" | "bonus" | "refund";
  amount: number;
  status: "pending" | "completed" | "failed" | "processing";
  description: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  created_at: string;
  completed_at: string | null;
}

const typeConfig = {
  commission: { icon: ArrowDownLeft, label: "Comissão", color: "text-primary" },
  withdrawal: { icon: ArrowUpRight, label: "Saque", color: "text-destructive" },
  bonus: { icon: Gift, label: "Bônus", color: "text-accent" },
  refund: { icon: RefreshCw, label: "Estorno", color: "text-warning" },
};

const statusConfig = {
  completed: { icon: CheckCircle, label: "Concluído", class: "bg-primary/10 text-primary" },
  pending: { icon: Clock, label: "Pendente", class: "bg-warning/10 text-warning" },
  processing: { icon: Loader2, label: "Processando", class: "bg-accent/10 text-accent" },
  failed: { icon: XCircle, label: "Falhou", class: "bg-destructive/10 text-destructive" },
};

const pixKeyTypes = [
  { value: "cpf", label: "CPF" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "random", label: "Chave aleatória" },
];

export default function Wallet() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "commission" | "withdrawal" | "bonus">("all");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("cpf");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  useEffect(() => {
    if (user) fetchTransactions();
    else setLoading(false);
  }, [user]);

  const demoMode = demo.isOn();

  const fetchTransactions = async () => {
    if (!user) return;
    // Demo: a carteira reflete o MESMO ledger de "Meus Ganhos" (platform_credits).
    if (demoMode) {
      const mapped: WalletTransaction[] = demo.credits().map((c) => ({
        id: c.id,
        type: c.kind === "withdrawal" ? "withdrawal" : c.kind === "platform_fee" ? "refund" : c.amount >= 0 ? "commission" : "withdrawal",
        amount: c.amount,
        status: "completed",
        description: CREDIT_LABEL[c.kind] ?? "Lançamento",
        pix_key: null, pix_key_type: null,
        created_at: c.created_at, completed_at: c.created_at,
      }));
      setTransactions(mapped);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) setTransactions(data as WalletTransaction[]);
    setLoading(false);
  };

  // Saldo: no demo usa o ledger de split; no real, soma das transações concluídas.
  const balance = demoMode
    ? demo.balance()
    : transactions.filter(t => t.status === "completed").reduce((sum, t) => sum + Number(t.amount), 0);

  const pendingBalance = transactions
    .filter(t => t.status === "pending" && t.type !== "withdrawal")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const pendingWithdrawals = transactions
    .filter(t => t.status === "pending" && t.type === "withdrawal")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

  const totalWithdrawn = transactions
    .filter(t => t.type === "withdrawal" && t.status === "completed")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

  const handleWithdraw = async () => {
    if (!user || !withdrawAmount || !pixKey) return;
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Valor inválido" });
      return;
    }
    if (amount > balance) {
      toast({ variant: "destructive", title: "Saldo insuficiente", description: `Seu saldo disponível é ${fmt(balance)}` });
      return;
    }
    if (amount < 10) {
      toast({ variant: "destructive", title: "Valor mínimo", description: "O saque mínimo é R$ 10,00" });
      return;
    }

    // Demo: registra o saque no ledger local (sem Mercado Pago).
    if (demoMode) {
      demo.addCredit({
        id: demoId("wd"), user_id: user.id, kind: "withdrawal", amount: -amount,
        status: "completed", created_at: new Date().toISOString(),
      });
      toast({ title: "Saque solicitado! 💸", description: `${fmt(amount)} via PIX a caminho.` });
      setWithdrawAmount(""); setPixKey("");
      fetchTransactions();
      return;
    }

    setIsWithdrawing(true);
    try {
      const { error } = await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        type: "withdrawal",
        amount: -amount,
        status: "pending",
        description: `Saque PIX — ${pixKeyTypes.find(p => p.value === pixKeyType)?.label}`,
        pix_key: pixKey,
        pix_key_type: pixKeyType,
      });

      if (error) throw error;

      toast({ title: "Saque solicitado! 💰", description: `${fmt(amount)} será enviado via PIX em até 48h.` });
      setWithdrawAmount("");
      setPixKey("");
      fetchTransactions();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao solicitar saque", description: err.message });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const filtered = filter === "all" ? transactions : transactions.filter(t => t.type === filter);

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 p-6 text-center">
      <WalletIcon className="h-10 w-10 text-muted-foreground/20" />
      <p className="text-sm font-medium">Faça login para acessar sua wallet</p>
      <Button asChild size="sm" className="rounded-full"><Link to="/auth">Entrar</Link></Button>
    </div>
  );

  if (loading) return (
    <div className="max-w-5xl mx-auto py-2 space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 rounded-2xl bg-muted/20 animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full">
          <Link to="/affiliate"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Wallet</h1>
          <p className="text-[11px] text-muted-foreground/40">Saldo, transações e saques</p>
        </div>
      </div>

      {/* Balance Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-primary/15 via-accent/5 to-background border border-primary/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <p className="text-[9px] text-muted-foreground/40 uppercase tracking-widest font-semibold">Saldo disponível</p>
        <p className="text-3xl font-black mt-1">{fmt(balance)}</p>
        <div className="flex gap-5 mt-3 text-[10px]">
          <span className="text-muted-foreground/50">Pendente: <strong className="text-warning">{fmt(pendingBalance)}</strong></span>
          <span className="text-muted-foreground/50">Sacado: <strong className="text-primary">{fmt(totalWithdrawn)}</strong></span>
        </div>

        {/* Withdraw button */}
        <Sheet>
          <SheetTrigger asChild>
            <Button size="sm" className="mt-4 rounded-full text-[10px] h-9 gap-1.5 w-full" disabled={balance <= 0}>
              <DollarSign className="h-3 w-3" />
              Sacar via PIX
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl border-border/20">
            <SheetHeader>
              <SheetTitle className="text-base">Solicitar Saque PIX</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-[11px] text-muted-foreground/50">Valor (mín. R$ 10,00)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/30">R$</span>
                  <Input
                    type="number" step="0.01" min="10" max={balance}
                    placeholder="0,00" className="pl-10 h-11 text-lg font-bold rounded-xl border-border/20"
                    value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                </div>
                <p className="text-[9px] text-muted-foreground/30 mt-1">Disponível: {fmt(balance)}</p>
              </div>

              <div>
                <Label className="text-[11px] text-muted-foreground/50">Tipo de chave PIX</Label>
                <Select value={pixKeyType} onValueChange={setPixKeyType}>
                  <SelectTrigger className="h-10 rounded-xl border-border/20 mt-1 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pixKeyTypes.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[11px] text-muted-foreground/50">Chave PIX</Label>
                <Input
                  placeholder={pixKeyType === "cpf" ? "000.000.000-00" : pixKeyType === "email" ? "seu@email.com" : pixKeyType === "phone" ? "(00) 00000-0000" : "Chave aleatória"}
                  className="h-10 rounded-xl border-border/20 mt-1 text-sm"
                  value={pixKey} onChange={(e) => setPixKey(e.target.value)}
                />
              </div>
            </div>
            <SheetFooter className="gap-2">
              <SheetClose asChild><Button variant="ghost" size="sm" className="rounded-full">Cancelar</Button></SheetClose>
              <Button size="sm" onClick={handleWithdraw}
                disabled={!withdrawAmount || !pixKey || isWithdrawing}
                className="rounded-full bg-foreground text-background">
                {isWithdrawing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : `Sacar ${withdrawAmount ? fmt(parseFloat(withdrawAmount) || 0) : ""}`}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Comissões", value: fmt(transactions.filter(t => t.type === "commission" && t.status === "completed").reduce((s, t) => s + Number(t.amount), 0)), color: "text-primary" },
          { label: "Bônus", value: fmt(transactions.filter(t => t.type === "bonus" && t.status === "completed").reduce((s, t) => s + Number(t.amount), 0)), color: "text-accent" },
          { label: "Em saque", value: fmt(pendingWithdrawals), color: "text-warning" },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-2xl bg-muted/20 border border-border/15 text-center">
            <p className={cn("text-sm font-bold", s.color)}>{s.value}</p>
            <span className="text-[8px] text-muted-foreground/30 uppercase tracking-wider font-semibold">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Transaction History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold">Histórico</h2>
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-auto h-7 text-[10px] border-border/15 rounded-full px-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="commission">Comissões</SelectItem>
              <SelectItem value="withdrawal">Saques</SelectItem>
              <SelectItem value="bonus">Bônus</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <WalletIcon className="h-8 w-8 mx-auto text-muted-foreground/10" />
            <p className="text-xs text-muted-foreground/30">Nenhuma transação encontrada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => {
              const cfg = typeConfig[t.type];
              const sCfg = statusConfig[t.status];
              const Icon = cfg.icon;
              const StatusIcon = sCfg.icon;
              const isNegative = Number(t.amount) < 0;

              return (
                <div key={t.id} className="p-4 rounded-2xl border border-border/15 bg-background flex items-center gap-3">
                  <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", isNegative ? "bg-destructive/10" : "bg-primary/10")}>
                    <Icon className={cn("h-4 w-4", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{t.description || cfg.label}</p>
                    <p className="text-[9px] text-muted-foreground/30 mt-0.5">
                      {format(new Date(t.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      {t.pix_key && ` · PIX: ${t.pix_key}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-sm font-bold", isNegative ? "text-destructive" : "text-primary")}>
                      {isNegative ? "-" : "+"}{fmt(Math.abs(Number(t.amount)))}
                    </p>
                    <Badge variant="secondary" className={cn("text-[8px] rounded-full border-0 gap-0.5 px-1.5 py-0", sCfg.class)}>
                      <StatusIcon className={cn("h-2 w-2", t.status === "processing" && "animate-spin")} />
                      {sCfg.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
