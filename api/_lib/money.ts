export class CampaignInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CampaignInputError";
  }
}

export const PLATFORM_FEE_PCT = 20;
export const MIN_REWARD = 10;
export const PERMUTA_FEE = 25;
export const PROCESS_GROSS_PER_SLOT = 134;
export const PROCESS_PHASES = Object.freeze({
  connection: Object.freeze({ brand: 25, affiliate: 20 }),
  video: Object.freeze({ amount: 2, max: 10 }),
  live: Object.freeze({ amount: 10, max: 7 }),
});

export interface CampaignMoney {
  rewardAmount: number;
  slots: number;
  platformFeePct: number;
  totalBudget: number;
  campaignKind: "standard" | "process";
  phases: Record<string, unknown>;
  payMode: "escrow" | "split";
  funded: boolean;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export function deriveCampaignMoney(input: Record<string, unknown>, splitLive: boolean): CampaignMoney {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 2 || name.length > 120) {
    throw new CampaignInputError("name deve ter entre 2 e 120 caracteres");
  }

  const slots = Number(input.slots);
  if (!Number.isInteger(slots) || slots < 1 || slots > 100) {
    throw new CampaignInputError("slots deve estar entre 1 e 100");
  }

  const campaignKind = input.campaign_kind === "process" ? "process" : "standard";
  const rewardType = input.reward_type === "permuta" ? "permuta" : "paid";
  let rewardAmount = 0;
  let totalBudget = 0;
  let phases: Record<string, unknown> = {};

  if (campaignKind === "process") {
    totalBudget = round2(PROCESS_GROSS_PER_SLOT * slots);
    phases = {
      connection: { ...PROCESS_PHASES.connection },
      video: { ...PROCESS_PHASES.video },
      live: { ...PROCESS_PHASES.live },
    };
  } else if (rewardType === "permuta") {
    totalBudget = round2(PERMUTA_FEE * slots);
  } else {
    rewardAmount = round2(Number(input.reward_amount));
    if (!Number.isFinite(rewardAmount) || rewardAmount < MIN_REWARD || rewardAmount > 1_000_000) {
      throw new CampaignInputError("reward_amount deve ser no mínimo R$ 10");
    }
    totalBudget = round2(rewardAmount * slots * (1 + PLATFORM_FEE_PCT / 100));
  }

  return {
    rewardAmount,
    slots,
    platformFeePct: PLATFORM_FEE_PCT,
    totalBudget,
    campaignKind,
    phases,
    payMode: splitLive ? "split" : "escrow",
    funded: splitLive,
  };
}
