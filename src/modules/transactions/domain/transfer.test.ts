import { describe, expect, it } from "vitest";
import type { Account } from "@/modules/accounts";
import { planTransfer, resolveTransferAmounts } from "./transfer";

function account(overrides: Partial<Account>): Account {
  return {
    id: "a",
    type: "CHECKING",
    name: "Cuenta",
    institution: null,
    currency: "CLP",
    openingBalance: 0,
    creditLimit: null,
    secondaryCurrency: null,
    secondaryCreditLimit: null,
    secondaryOpeningBalance: 0,
    closingDay: null,
    dueDay: null,
    archived: false,
    ...overrides,
  };
}

describe("resolveTransferAmounts", () => {
  const usdDebtFromPesos = { fromCurrency: "CLP" as const, toCurrency: "USD" as const };

  it("moves the same amount within one currency", () => {
    expect(
      resolveTransferAmounts({
        fromCurrency: "CLP",
        toCurrency: "CLP",
        sent: 50_000,
        received: null,
        clpPerUsd: null,
      }),
    ).toEqual({ ok: true, value: { sent: 50_000, received: 50_000 } });
  });

  it("uses what was paid in pesos when given", () => {
    // USD 100.00 paid with $97.000
    expect(
      resolveTransferAmounts({
        ...usdDebtFromPesos,
        sent: 97_000,
        received: 10_000,
        clpPerUsd: null,
      }),
    ).toEqual({ ok: true, value: { sent: 97_000, received: 10_000 } });
  });

  it("derives the pesos from the bank rate", () => {
    // USD 100.00 at $970,50 per dollar = $97.050
    expect(
      resolveTransferAmounts({
        ...usdDebtFromPesos,
        sent: null,
        received: 10_000,
        clpPerUsd: 970.5,
      }),
    ).toEqual({ ok: true, value: { sent: 97_050, received: 10_000 } });
  });

  it("derives the dollars from pesos sent and the rate", () => {
    expect(
      resolveTransferAmounts({ ...usdDebtFromPesos, sent: 97_000, received: null, clpPerUsd: 970 }),
    ).toEqual({ ok: true, value: { sent: 97_000, received: 10_000 } });
  });

  it("asks for the missing piece between currencies", () => {
    expect(
      resolveTransferAmounts({ ...usdDebtFromPesos, sent: null, received: 10_000, clpPerUsd: null })
        .ok,
    ).toBe(false);
    expect(
      resolveTransferAmounts({ ...usdDebtFromPesos, sent: null, received: null, clpPerUsd: 970 })
        .ok,
    ).toBe(false);
  });
});

describe("planTransfer", () => {
  const checking = account({ id: "checking" });
  const card = account({
    id: "card",
    type: "CREDIT_CARD",
    creditLimit: 1_000_000,
    secondaryCurrency: "USD",
    secondaryCreditLimit: 100_000,
  });

  it("pays the international debt of a card in its currency", () => {
    expect(planTransfer(checking, card, "USD", { sent: 97_000, received: 10_000 })).toEqual({
      ok: true,
      value: { fromAmount: -97_000, fromCurrency: "CLP", toAmount: 10_000, toCurrency: "USD" },
    });
  });

  it("rejects currencies the destination does not hold", () => {
    expect(planTransfer(card, checking, "USD", { sent: 1, received: 1 }).ok).toBe(false);
  });

  it("rejects transfers to the same account", () => {
    expect(planTransfer(checking, checking, "CLP", { sent: 1, received: 1 }).ok).toBe(false);
  });
});
