import { afterAll, describe, expect, it } from "vitest";
import { createAccount, updateAccount } from "@/modules/accounts/application/manage-accounts";
import {
  getCategoryBreakdown,
  getMonthSummary,
  getNetWorth,
} from "@/modules/metrics/application/dashboard";
import { getAccountBalances } from "@/modules/transactions";
import { recordExpense } from "@/modules/transactions/application/record-transaction";
import { recordTransfer } from "@/modules/transactions/application/record-transfer";
import { monthOf } from "@/shared/domain";
import { prisma } from "@/shared/infrastructure";
import { TODAY, categoryId, createChecking, createUser, unwrap } from "./helpers";

afterAll(() => prisma.$disconnect());

const viewer = (id: string) => ({ id, baseCurrency: "CLP" as const });
const month = monthOf(TODAY);

/** Card with a national (CLP) and an international (USD) quota. Test rate: 1 USD = 950 CLP. */
async function dualCard(userId: string) {
  return unwrap(
    await createAccount(userId, {
      type: "CREDIT_CARD",
      currency: "CLP",
      name: "Visa dual",
      creditLimit: "1.000.000",
      international: true,
      secondaryCreditLimit: "2.000",
    }),
  );
}

describe("dual-currency credit cards", () => {
  it("values dollar purchases at today's rate until paid, then at what was paid", async () => {
    const userId = await createUser();
    const checking = await createChecking(userId, "1.000.000");
    const card = await dualCard(userId);
    expect(card.secondaryCurrency).toBe("USD");

    unwrap(
      await recordExpense(userId, {
        accountId: card.id,
        currency: "USD",
        categoryId: await categoryId(userId, "Tecnología"),
        amount: "100",
        date: TODAY,
        description: "Teclado",
      }),
    );
    let card$ = (await getAccountBalances(userId, TODAY)).get(card.id)!;
    expect(card$.posted).toBe(0);
    expect(card$.secondary).toEqual({ currency: "USD", posted: -10_000, scheduled: 0 });

    // Unpaid: USD 100 x 950.
    let summary = await getMonthSummary(viewer(userId), month, TODAY);
    expect(summary.expense).toBe(95_000);
    let worth = await getNetWorth(viewer(userId), TODAY);
    expect(worth.liabilities).toBe(95_000);

    // Paid with $97.000 from the peso account.
    unwrap(
      await recordTransfer(userId, {
        fromAccountId: checking.id,
        toAccountId: card.id,
        toCurrency: "USD",
        toAmount: "100",
        amount: "97.000",
        date: TODAY,
      }),
    );
    const balances = await getAccountBalances(userId, TODAY);
    expect(balances.get(checking.id)!.posted).toBe(903_000);
    card$ = balances.get(card.id)!;
    expect(card$.secondary!.posted).toBe(0);

    summary = await getMonthSummary(viewer(userId), month, TODAY);
    expect(summary.expense).toBe(97_000);
    const { slices } = await getCategoryBreakdown(viewer(userId), month, TODAY);
    expect(slices[0]).toMatchObject({ name: "Compras", amount: 97_000 });
    worth = await getNetWorth(viewer(userId), TODAY);
    expect(worth.liabilities).toBe(0);
    expect(worth.assets).toBe(903_000);
  });

  it("enables the dollar quota just by typing its limit", async () => {
    const userId = await createUser();
    const card = unwrap(
      await createAccount(userId, {
        type: "CREDIT_CARD",
        currency: "CLP",
        name: "Mastercard",
        creditLimit: "500.000",
        secondaryCreditLimit: "1.500",
        secondaryOpeningBalance: "120,50",
      }),
    );
    expect(card).toMatchObject({
      currency: "CLP",
      creditLimit: 500_000,
      secondaryCurrency: "USD",
      secondaryCreditLimit: 150_000,
      secondaryOpeningBalance: -12_050,
    });
    const balance = (await getAccountBalances(userId, TODAY)).get(card.id)!;
    expect(balance.secondary).toEqual({ currency: "USD", posted: -12_050, scheduled: 0 });
  });

  it("pays a dollar debt with the bank's rate", async () => {
    const userId = await createUser();
    const checking = await createChecking(userId, "100.000");
    const card = await dualCard(userId);
    unwrap(
      await recordExpense(userId, {
        accountId: card.id,
        currency: "USD",
        categoryId: await categoryId(userId, "Suscripciones"),
        amount: "50",
        date: TODAY,
        description: "Software",
      }),
    );
    unwrap(
      await recordTransfer(userId, {
        fromAccountId: checking.id,
        toAccountId: card.id,
        toCurrency: "USD",
        toAmount: "50",
        rate: "980",
        date: TODAY,
      }),
    );
    expect((await getAccountBalances(userId, TODAY)).get(checking.id)!.posted).toBe(51_000);
    expect((await getMonthSummary(viewer(userId), month, TODAY)).expense).toBe(49_000);
  });

  it("asks for the pesos or the rate when paying across currencies", async () => {
    const userId = await createUser();
    const checking = await createChecking(userId);
    const card = await dualCard(userId);
    const result = await recordTransfer(userId, {
      fromAccountId: checking.id,
      toAccountId: card.id,
      toCurrency: "USD",
      toAmount: "50",
      date: TODAY,
    });
    expect(result.ok).toBe(false);
  });

  it("only allows the other currency on cards with an international quota", async () => {
    const userId = await createUser();
    const checking = await createChecking(userId);
    const usdOnChecking = await recordExpense(userId, {
      accountId: checking.id,
      currency: "USD",
      categoryId: await categoryId(userId, "Supermercado"),
      amount: "10",
      date: TODAY,
      description: "x",
    });
    expect(usdOnChecking.ok).toBe(false);

    const internationalChecking = await createAccount(userId, {
      type: "CHECKING",
      currency: "CLP",
      name: "Corriente con cupo",
      international: true,
      secondaryCreditLimit: "100",
    });
    expect(internationalChecking.ok).toBe(false);

    const card = await dualCard(userId);
    const removeQuota = await updateAccount(userId, card.id, {
      name: card.name,
      creditLimit: "1.000.000",
      international: false,
    });
    expect(removeQuota.ok).toBe(false);
  });
});
