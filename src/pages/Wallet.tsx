import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
  SheetTrigger, SheetFooter, SheetClose,
} from "@/components/ui/sheet";
import {
  DollarSign, ArrowDownLeft, ArrowUpRight, Gift, RefreshCw,
  Wallet as WalletIcon, Loader2, CheckCircle, Clock, XCircle, ChevronLeft,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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

const WITHDRAW_MIN = 10;
// Arredondamento monetário defensivo: o split 80/20 pode chegar aqui com
// floats sujos (ex.: 35.99999). Tratamos tudo a 2 casas antes de exibir/somar.
const round2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;

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

// Dinheiro ENTRANDO = cyan (accent, "cor do dinheiro"); SAINDO = vermelho.
const typeConfig = {
  commission: { icon: ArrowDownLeft, label: "Comissão", color: "text-accent", bg: "bg-accent/10" },
  bonus: { icon: Gift, label: "Bônus", color: "text-accent", bg: "bg-accent/10" },
  withdrawal: { icon: ArrowUpRight, label: "Saque", color: "text-destructive", bg: "bg-destructive/10" },
  refund: { icon: RefreshCw, label: "Estorno", color: "text-warning", bg: "bg-warning/10" },
};

// Badge só aparece quando NÃO está concluído (reduz ruído; concluído é o default).
const statusConfig = {
  completed: { icon: CheckCircle, label: "Concluído", class: "bg-accent/10 text-accent" },
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

// Chave do "kit demo" (bônus de boas-vindas) — semeado uma vez por usuário.
const DEMO_SEED_KEY = "onlyshop_demo_wallet_seeded";

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
  const [sheetOpen, setSheetOpen] = useState(false);

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(round2(v));

  const demoMode = demo.isOn();

  useEffect(() => {
    if (user) fetchTransactions();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Semeia uma vez o ciclo completo da carteira no demo (bônus + 1 a receber),
  // pra a tela nunca nascer vazia/zerada na primeira impressão.
  const seedDemoWalletOnce = () => {
    if (!user) return;
    if (localStorage.getItem(DEMO_SEED_KEY)) return;
    const hasLedger = demo.credits(user.id).length > 0;
    localStorage.setItem(DEMO_SEED_KEY, "1");
    if (hasLedger) return; // não polui um ledger que já tem histórico real
    const now = Date.now();
    demo.addCredit({
      id: demoId("bonus"), user_id: user.id, kind: "refund", amount: 10,
      status: "completed", created_at: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
    });
    demo.addCredit({
      id: demoId("payout"), user_id: user.id, kind: "payout", amount: 40,
      status: "completed", created_at: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
    });
  };

  const fetchTransactions = async () => {
    if (!user) return;
    // Demo: a carteira reflete o MESMO ledger de "Meus Ganhos" (platform_credits),
    // lido sempre por user.id pra bater com Affiliate/Mapa.
    if (demoMode) {
      seedDemoWalletOnce();
      const mapped: WalletTransaction[] = demo
        .credits(user.id)
        // A taxa da plataforma (20%) não pertence ao usuário — fora da carteira dele.
        .filter((c) => c.user_id === user.id && c.kind !== "platform_fee")
        .map((c) => ({
          id: c.id,
          type:
            c.kind === "withdrawal"
              ? "withdrawal"
              : c.kind === "refund"
              ? "bonus"
              : c.amount >= 0
              ? "commission"
              : "withdrawal",
          amount: round2(c.amount),
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

  // Saldo: no demo usa o ledger de split (por user.id); no real, soma das concluídas.
  const balance = round2(
    demoMode
      ? demo.balance(user?.id)
      : transactions.filter((t) => t.status === "completed").reduce((sum, t) => sum + Number(t.amount), 0)
  );

  // Totais legíveis (válidos no demo e no real, lidos do mesmo ledger).
  const totalReceived = round2(
    transactions
      .filter((t) => (t.type === "commission" || t.type === "bonus") && Number(t.amount) > 0)
      .reduce((s, t) => s + Number(t.amount), 0)
  );
  const totalWithdrawn = round2(
    transactions
      .filter((t) => t.type === "withdrawal" && t.status === "completed")
      .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
  );
  const pendingWithdrawals = round2(
    transactions
      .filter((t) => t.status === "pending" && t.type === "withdrawal")
      .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
  );

  const belowMin = balance > 0 && balance < WITHDRAW_MIN;

  const handleWithdraw = async () => {
    if (!user || !withdrawAmount || !pixKey) return;
    const amount = round2(parseFloat(withdrawAmount));
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Valor inválido" });
      return;
    }
    if (amount < WITHDRAW_MIN) {
      toast({ variant: "destructive", title: "Valor mínimo", description: `O saque mínimo é ${fmt(WITHDRAW_MIN)}` });
      return;
    }

    // Demo: registra o saque no ledger local (sem Mercado Pago).
    if (demoMode) {
      setIsWithdrawing(true);
      // Re-lê o saldo IMEDIATAMENTE antes do débito (evita corrida/duplo-saque).
      const fresh = round2(demo.balance(user.id));
      if (amount > fresh) {
        setIsWithdrawing(false);
        toast({ variant: "destructive", title: "Saldo insuficiente", description: `Seu saldo disponível é ${fmt(fresh)}` });
        return;
      }
      await new Promise((r) => setTimeout(r, 600)); // micro-delay de processamento
      demo.addCredit({
        id: demoId("wd"), user_id: user.id, kind: "withdrawal", amount: -amount,
        status: "completed", created_at: new Date().toISOString(),
      });
      toast({ title: "Saque solicitado!", description: `${fmt(amount)} via PIX a caminho.` });
      setWithdrawAmount(""); setPixKey("");
      setIsWithdrawing(false);
      setSheetOpen(false);
      fetchTransactions();
      return;
    }

    if (amount > balance) {
      toast({ variant: "destructive", title: "Saldo insuficiente", description: `Seu saldo disponível é ${fmt(balance)}` });
      return;
    }

    setIsWithdrawing(true);
    try {
      const { error } = await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        type: "withdrawal",
        amount: -amount,
        status: "pending",
        description: `Saque PIX — ${pixKeyTypes.find((p) => p.value === pixKeyType)?.label}`,
        pix_key: pixKey,
        pix_key_type: pixKeyType,
      });

      if (error) throw error;

      toast({ title: "Saque solicitado!", description: `${fmt(amount)} será enviado via PIX em até 48h.` });
      setWithdrawAmount("");
      setPixKey("");
      setSheetOpen(false);
      fetchTransactions();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao solicitar saque", description: err.message });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const filtered = filter === "all" ? transactions : transactions.filter((t) => t.type === filter);

  const filterLabel: Record<string, string> = {
    commission: "comissão", withdrawal: "saque", bonus: "bônus",
  };

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center animate-fade-in">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 ring-1 ring-accent/20">
        <WalletIcon className="h-7 w-7 text-accent" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-bold">Sua carteira te espera</p>
        <p className="text-xs text-muted-foreground/60 max-w-[16rem]">
          Entre pra ver saldo, extrato e sacar seus ganhos via PIX.
        </p>
      </div>
      <Button asChild className="rounded-full bg-gradient-primary text-white border-0 h-11 px-6 gap-2 active:scale-[.98]">
        <Link to="/auth">
          Entrar
          <span className="grid h-5 w-5 place-items-center rounded-full bg-white/15">
            <ArrowUpRight className="h-3 w-3 rotate-45" />
          </span>
        </Link>
      </Button>
    </div>
  );

  if (loading) return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="h-10 w-40 rounded-xl bg-muted/20 animate-pulse" />
      <div className="h-44 rounded-[1.75rem] bg-muted/20 animate-pulse" />
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[4.5rem] rounded-[1.5rem] bg-muted/20 animate-pulse" />
        ))}
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[4.25rem] rounded-[1.5rem] bg-muted/20 animate-pulse" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 animate-fade-in">
        <Button
          asChild variant="ghost" size="icon" aria-label="Voltar"
          className="h-10 w-10 rounded-full shrink-0"
        >
          <Link to="/affiliate"><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Carteira</h1>
          <p className="text-xs text-muted-foreground/60">Saldo, extrato e saques via PIX</p>
        </div>
      </div>

      {/* Balance Card — double-bezel + glow de marca */}
      <div
        className="rounded-[1.75rem] bg-gradient-to-b from-white/[0.08] to-transparent p-px animate-slide-up"
        style={{ animationDelay: "40ms" }}
      >
        <div className="relative overflow-hidden rounded-[1.7rem] bg-gradient-to-br from-primary/15 via-accent/[0.06] to-card p-6 shadow-[var(--shadow-bezel-inset)]">
          {/* orbs ambiente magenta↔cyan */}
          <div className="pointer-events-none absolute -top-10 -right-8 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-accent/10 blur-3xl" />

          <p className="relative text-[11px] uppercase tracking-[0.2em] font-semibold text-muted-foreground/50">
            Saldo disponível
          </p>
          <p className="relative mt-1.5 text-4xl font-black tabular-nums text-accent">{fmt(balance)}</p>

          <div className="relative mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px]">
            <span className="text-muted-foreground/60">
              Recebido <strong className="ml-0.5 text-accent tabular-nums">{fmt(totalReceived)}</strong>
            </span>
            <span className="text-muted-foreground/60">
              Sacado <strong className="ml-0.5 text-foreground tabular-nums">{fmt(totalWithdrawn)}</strong>
            </span>
          </div>

          {/* Microcopy quando saldo > 0 mas abaixo do mínimo de saque */}
          {belowMin && (
            <p className="relative mt-3 text-[11px] text-warning/90">
              Faltam {fmt(WITHDRAW_MIN - balance)} pra atingir o saque mínimo de {fmt(WITHDRAW_MIN)}.
            </p>
          )}

          {/* Withdraw CTA */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button
                className="group relative mt-4 h-11 w-full gap-2 rounded-full bg-gradient-primary text-white border-0 text-sm font-semibold shadow-[var(--shadow-glow-cta)] transition-transform active:scale-[.98] [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] disabled:shadow-none disabled:opacity-50"
                disabled={balance < WITHDRAW_MIN}
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-white/15">
                  <DollarSign className="h-3 w-3" />
                </span>
                Sacar via PIX
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl border-border/20">
              <SheetHeader>
                <SheetTitle className="text-base">Solicitar saque PIX</SheetTitle>
                <SheetDescription className="sr-only">
                  Informe o valor e a chave PIX para sacar seu saldo disponível.
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-[11px] text-muted-foreground/60">Valor (mín. {fmt(WITHDRAW_MIN)})</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/40">R$</span>
                    <Input
                      type="number" step="0.01" min={WITHDRAW_MIN} max={balance}
                      placeholder="0,00"
                      className="h-12 pl-10 text-lg font-bold tabular-nums rounded-xl border-border/20"
                      value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(String(balance))}
                    className="mt-1.5 text-[11px] text-accent/80 hover:text-accent active:scale-[.98] transition"
                  >
                    Disponível: <span className="font-semibold tabular-nums">{fmt(balance)}</span> · sacar tudo
                  </button>
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground/60">Tipo de chave PIX</Label>
                  <Select value={pixKeyType} onValueChange={setPixKeyType}>
                    <SelectTrigger aria-label="Tipo de chave PIX" className="mt-1.5 h-11 rounded-xl border-border/20 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pixKeyTypes.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground/60">Chave PIX</Label>
                  <Input
                    placeholder={pixKeyType === "cpf" ? "000.000.000-00" : pixKeyType === "email" ? "seu@email.com" : pixKeyType === "phone" ? "(00) 00000-0000" : "Chave aleatória"}
                    className="mt-1.5 h-11 rounded-xl border-border/20 text-sm"
                    value={pixKey} onChange={(e) => setPixKey(e.target.value)}
                  />
                </div>
              </div>
              <SheetFooter className="gap-2">
                <SheetClose asChild>
                  <Button variant="ghost" className="h-11 rounded-full">Cancelar</Button>
                </SheetClose>
                <Button
                  onClick={handleWithdraw}
                  disabled={!withdrawAmount || !pixKey || isWithdrawing}
                  aria-busy={isWithdrawing}
                  className="h-11 gap-2 rounded-full bg-accent text-accent-foreground font-semibold active:scale-[.98] transition-transform disabled:opacity-50"
                >
                  {isWithdrawing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="sr-only">Processando saque…</span>
                    </>
                  ) : (
                    <>Sacar {withdrawAmount ? fmt(parseFloat(withdrawAmount) || 0) : ""}</>
                  )}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Summary cards — métricas reais do ledger (nada de R$0 morto) */}
      <div className="grid grid-cols-3 gap-2.5 animate-slide-up" style={{ animationDelay: "80ms" }}>
        {[
          { label: "Recebido", value: fmt(totalReceived), color: "text-accent" },
          { label: "Sacado", value: fmt(totalWithdrawn), color: "text-foreground" },
          { label: "Saldo", value: fmt(balance), color: "text-accent" },
        ].map((s) => (
          <div key={s.label} className="rounded-[1.5rem] bg-gradient-to-b from-white/[0.05] to-transparent p-px">
            <div className="rounded-[1.45rem] bg-card/60 backdrop-blur px-2.5 py-3 text-center shadow-[var(--shadow-bezel-inset)]">
              <p className={cn("text-base font-black tabular-nums leading-tight", s.color)}>{s.value}</p>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/50">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Extrato */}
      <div className="animate-slide-up" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold">Extrato</h2>
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger aria-label="Filtrar transações" className="h-9 w-auto rounded-full border-border/15 px-3.5 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="commission">Ganhos</SelectItem>
              <SelectItem value="withdrawal">Saques</SelectItem>
              <SelectItem value="bonus">Bônus</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          filter === "all" ? (
            // (a) carteira vazia — copy convidativa + CTA pro mapa
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 ring-1 ring-accent/20">
                <Sparkles className="h-6 w-6 text-accent" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold">Sua carteira está vazia</p>
                <p className="text-xs text-muted-foreground/60 max-w-[17rem]">
                  Aceite uma campanha perto de você e seu primeiro pagamento aparece aqui.
                </p>
              </div>
              <Button asChild className="group h-11 gap-2 rounded-full bg-gradient-primary text-white border-0 px-5 active:scale-[.98]">
                <Link to="/mapa">
                  Ver campanhas no mapa
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
                    <ArrowUpRight className="h-3 w-3 rotate-45" />
                  </span>
                </Link>
              </Button>
            </div>
          ) : (
            // (b) filtro sem resultado — ação pra limpar o filtro
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <WalletIcon className="h-8 w-8 text-muted-foreground/20" />
              <p className="text-xs text-muted-foreground/60">
                Nenhum lançamento de {filterLabel[filter] ?? "filtro"} ainda
              </p>
              <Button variant="ghost" size="sm" className="rounded-full text-accent" onClick={() => setFilter("all")}>
                Ver todas
              </Button>
            </div>
          )
        ) : (
          <div className="space-y-2.5">
            {filtered.map((t, i) => {
              const cfg = typeConfig[t.type];
              const sCfg = statusConfig[t.status];
              const Icon = cfg.icon;
              const StatusIcon = sCfg.icon;
              const isNegative = Number(t.amount) < 0;

              return (
                <div
                  key={t.id}
                  className="rounded-[1.5rem] bg-gradient-to-b from-white/[0.04] to-transparent p-px animate-fade-in"
                  style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                >
                  <div className="flex items-center gap-3 rounded-[1.45rem] bg-card/60 backdrop-blur px-4 py-3.5 shadow-[var(--shadow-bezel-inset)]">
                    <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", cfg.bg)}>
                      <Icon className={cn("h-4 w-4", cfg.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">{t.description || cfg.label}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground/50">
                        {format(new Date(t.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                        {t.pix_key && ` · PIX: ${t.pix_key}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn("text-[15px] font-black tabular-nums", isNegative ? "text-destructive" : "text-accent")}>
                        {isNegative ? "−" : "+"}{fmt(Math.abs(Number(t.amount)))}
                      </p>
                      {/* Badge só quando NÃO concluído (concluído é o default, sem ruído) */}
                      {t.status !== "completed" && (
                        <Badge
                          variant="secondary"
                          className={cn("mt-0.5 gap-1 rounded-full border-0 px-2 py-0 text-[10px]", sCfg.class)}
                        >
                          <StatusIcon className={cn("h-2.5 w-2.5", t.status === "processing" && "animate-spin")} />
                          {sCfg.label}
                        </Badge>
                      )}
                    </div>
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
