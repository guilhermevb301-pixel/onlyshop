import { describe, expect, it } from "vitest";
import { CampaignInputError, deriveCampaignMoney } from "../../../api/_lib/money";

const standard = {
  name: "Vídeo para lançamento",
  reward_type: "per_video",
  reward_amount: 100,
  slots: 3,
  campaign_kind: "standard",
};

describe("deriveCampaignMoney", () => {
  it("derives the standard total on the server and ignores forged financial fields", () => {
    const result = deriveCampaignMoney(
      { ...standard, funded: true, total_budget: 1, platform_fee_pct: 0, pay_mode: "split" },
      false,
    );

    expect(result).toEqual({
      rewardAmount: 100,
      slots: 3,
      platformFeePct: 20,
      totalBudget: 360,
      campaignKind: "standard",
      phases: {},
      payMode: "escrow",
      funded: false,
    });
  });

  it("uses the fixed permuta fee instead of a client-provided reward", () => {
    expect(deriveCampaignMoney({ ...standard, reward_type: "permuta", reward_amount: 9999, slots: 2 }, false)).toMatchObject({
      rewardAmount: 0,
      totalBudget: 50,
      payMode: "escrow",
      funded: false,
    });
  });

  it("forces the canonical process contract", () => {
    expect(
      deriveCampaignMoney(
        {
          ...standard,
          campaign_kind: "process",
          reward_amount: 0,
          slots: 2,
          phases: { connection: { brand: 1, affiliate: 9999 } },
        },
        false,
      ),
    ).toEqual({
      rewardAmount: 0,
      slots: 2,
      platformFeePct: 20,
      totalBudget: 268,
      campaignKind: "process",
      phases: {
        connection: { brand: 25, affiliate: 20 },
        video: { amount: 2, max: 10 },
        live: { amount: 10, max: 7 },
      },
      payMode: "escrow",
      funded: false,
    });
  });

  it("makes a split campaign visible only when the server feature flag is live", () => {
    expect(deriveCampaignMoney(standard, true)).toMatchObject({ payMode: "split", funded: true });
    expect(deriveCampaignMoney({ ...standard, pay_mode: "split", funded: true }, false)).toMatchObject({
      payMode: "escrow",
      funded: false,
    });
  });

  it.each([
    [{ ...standard, reward_amount: 9.99 }, "reward_amount deve ser no mínimo R$ 10"],
    [{ ...standard, slots: 0 }, "slots deve estar entre 1 e 100"],
    [{ ...standard, slots: 101 }, "slots deve estar entre 1 e 100"],
    [{ ...standard, name: "x" }, "name deve ter entre 2 e 120 caracteres"],
  ])("rejects an invalid campaign contract", (input, message) => {
    expect(() => deriveCampaignMoney(input, false)).toThrowError(new CampaignInputError(message));
  });
});
