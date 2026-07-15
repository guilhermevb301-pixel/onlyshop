// Fase 2 — recompensas/desafios do time ("quem mais vender ganha R$X").
// prize_amount é META/gamificação (informativo) — NÃO passa por MP nem pelo ledger.
export interface TeamReward {
  id: string;
  brand_id: string;
  title: string;
  description: string | null;
  prize_amount: number;
  criteria: string | null;
  metric: "deliveries" | "approvals" | "sales";
  goal: number | null;
  deadline: string | null;
  status: "draft" | "active" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface CreateRewardInput {
  title: string;
  description?: string | null;
  prize_amount: number;
  criteria?: string | null;
  metric?: TeamReward["metric"];
  goal?: number | null;
  deadline?: string | null;
}

export const METRIC_LABEL: Record<TeamReward["metric"], string> = {
  deliveries: "entregas",
  approvals: "aprovações",
  sales: "vendas",
};
