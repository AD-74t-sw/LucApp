import { afterAll, describe, expect, it } from "vitest";
import { provisionUser } from "@/modules/access";
import { listCategories } from "@/modules/categories";
import {
  createDebt,
  createPerson,
  deletePayment,
  recordPayment,
} from "@/modules/debts/application/manage-debts";
import { getPersonWithDebts } from "@/modules/debts";
import { getMonthSummary } from "@/modules/metrics";
import {
  createInstallmentPurchase,
  deleteInstallmentPlan,
} from "@/modules/transactions/application/installments";
import {
  deleteTransaction,
  recordExpense,
  recordIncome,
} from "@/modules/transactions/application/record-transaction";
import { recordTransfer } from "@/modules/transactions/application/record-transfer";
import {
  getAccountBalances,
  getTransaction,
  listInstallmentPlans,
  listTransactions,
} from "@/modules/transactions";
import { monthOf } from "@/shared/domain";
import { prisma } from "@/shared/infrastructure";
import {
  NEXT_MONTH,
  TODAY,
  categoryId,
  createChecking,
  createCreditCard,
  createUser,
  unwrap,
} from "./helpers";

afterAll(() => prisma.$disconnect());

describe("provisioning", () => {
  it("creates default categories with subcategories, only once", async () => {
    const userId = await createUser();
    const before = await listCategories(userId);
    expect(before.length).toBeGreaterThan(20);
    expect(before.some((c) => c.parentId !== null)).toBe(true);

    await provisionUser({ id: userId, email: `${userId}@test.local`, metadata: {} });
    expect((await listCategories(userId)).length).toBe(before.length);
  });
});

describe("expenses and balances", () => {
  it("records an expense with the classification inherited from its categories", async () => {
    const userId = await createUser();
    const checking = await createChecking(userId, "100.000");
    const tx = unwrap(
      await recordExpense(userId, {
        accountId: checking.id,
        categoryId: await categoryId(userId, "Restaurantes"),
        amount: "12.500",
        date: TODAY,
        description: "Almuerzo",
      }),
    );
    expect(tx.amount).toBe(-12500);
    expect(tx.costType).toBe("VARIABLE"); // from "Alimentación"
    expect(tx.necessity).toBe("DISCRETIONARY"); // from "Restaurantes"

    const balances = await getAccountBalances(userId, TODAY);
    expect(balances.get(checking.id)?.posted).toBe(87500);
  });

  it("rejects an income recorded in an expense category", async () => {
    const userId = await createUser();
    const checking = await createChecking(userId);
    const result = await recordIncome(userId, {
      accountId: checking.id,
      categoryId: await categoryId(userId, "Supermercado"),
      amount: "1000",
      date: TODAY,
      description: "x",
    });
    expect(result.ok).toBe(false);
  });
});

describe("transfers", () => {
  it("pays a credit card with two linked movements and deletes both together", async () => {
    const userId = await createUser();
    const checking = await createChecking(userId, "200000");
    const card = await createCreditCard(userId);
    unwrap(
      await recordExpense(userId, {
        accountId: card.id,
        categoryId: await categoryId(userId, "Supermercado"),
        amount: "80000",
        date: TODAY,
        description: "Súper",
      }),
    );
    unwrap(
      await recordTransfer(userId, {
        fromAccountId: checking.id,
        toAccountId: card.id,
        amount: "50000",
        date: TODAY,
      }),
    );
    let balances = await getAccountBalances(userId, TODAY);
    expect(balances.get(checking.id)?.posted).toBe(150000);
    expect(balances.get(card.id)?.posted).toBe(-30000);

    const transfer = (await listTransactions(userId, { kind: "TRANSFER", page: 1 }, TODAY))
      .items[0]!;
    unwrap(await deleteTransaction(userId, transfer.id));
    balances = await getAccountBalances(userId, TODAY);
    expect(balances.get(checking.id)?.posted).toBe(200000);
    expect(balances.get(card.id)?.posted).toBe(-80000);
  });
});

describe("installments", () => {
  it("creates one expense per installment that adds up to the total", async () => {
    const userId = await createUser();
    const card = await createCreditCard(userId);
    const { planId } = unwrap(
      await createInstallmentPurchase(userId, {
        accountId: card.id,
        categoryId: await categoryId(userId, "Tecnología"),
        totalAmount: "100000",
        installmentCount: 3,
        firstChargeDate: NEXT_MONTH,
        description: "Notebook",
      }),
    );
    const plan = (await listInstallmentPlans(userId, TODAY)).find((p) => p.id === planId)!;
    expect(plan.installments.map((i) => i.amount)).toEqual([-33334, -33333, -33333]);
    expect(plan.progress.charged).toBe(0);
    expect(plan.progress.remainingAmount).toBe(100000);

    const balance = (await getAccountBalances(userId, TODAY)).get(card.id)!;
    expect(balance.posted).toBe(0);
    expect(balance.scheduled).toBe(-100000);

    // A single installment cannot be deleted on its own.
    const installment = (
      await listTransactions(userId, { accountId: card.id, page: 1, scheduled: "include" }, TODAY)
    ).items[0]!;
    expect((await deleteTransaction(userId, installment.id)).ok).toBe(false);

    unwrap(await deleteInstallmentPlan(userId, planId));
    expect(
      (await listTransactions(userId, { accountId: card.id, page: 1, scheduled: "include" }, TODAY))
        .total,
    ).toBe(0);
  });
});

describe("debts", () => {
  it("tracks a loan with partial payments and account movements", async () => {
    const userId = await createUser();
    const checking = await createChecking(userId, "100000");
    const person = unwrap(await createPerson(userId, { name: "Ana" }));
    const { debtId } = unwrap(
      await createDebt(userId, {
        personId: person.id,
        direction: "THEY_OWE",
        amount: "20000",
        currency: "CLP",
        date: TODAY,
        description: "Préstamo",
        categoryId: await categoryId(userId, "Otros gastos"),
        accountId: checking.id,
      }),
    );
    expect((await getAccountBalances(userId, TODAY)).get(checking.id)?.posted).toBe(80000);

    expect(
      unwrap(
        await recordPayment(userId, debtId, {
          amount: "5000",
          date: TODAY,
          accountId: checking.id,
        }),
      ).settled,
    ).toBe(false);
    expect((await recordPayment(userId, debtId, { amount: "16000", date: TODAY })).ok).toBe(false);
    expect(
      unwrap(await recordPayment(userId, debtId, { amount: "15000", date: TODAY })).settled,
    ).toBe(true);

    let detail = (await getPersonWithDebts(userId, person.id))!;
    expect(detail.balances).toEqual([]);
    expect(detail.debts[0]!.settled).toBe(true);
    expect((await getAccountBalances(userId, TODAY)).get(checking.id)?.posted).toBe(85000);

    // Deleting the payment that had an account movement removes the movement too.
    const withMovement = detail.debts[0]!.payments.find((p) => p.transactionId !== null)!;
    unwrap(await deletePayment(userId, withMovement.id));
    detail = (await getPersonWithDebts(userId, person.id))!;
    expect(detail.debts[0]!.settled).toBe(false);
    expect(detail.balances).toEqual([{ currency: "CLP", owedToMe: 5000, iOwe: 0, net: 5000 }]);
    expect((await getAccountBalances(userId, TODAY)).get(checking.id)?.posted).toBe(80000);
  });

  it("rejects an account in a different currency than the debt", async () => {
    const userId = await createUser();
    const checking = await createChecking(userId);
    const person = unwrap(await createPerson(userId, { name: "Beto" }));
    const result = await createDebt(userId, {
      personId: person.id,
      direction: "I_OWE",
      amount: "100",
      currency: "USD",
      date: TODAY,
      description: "x",
      categoryId: await categoryId(userId, "Otros gastos"),
      accountId: checking.id,
    });
    expect(result.ok).toBe(false);
  });
});

describe("metrics", () => {
  it("counts incomes and expenses but not transfers or debts", async () => {
    const userId = await createUser();
    const checking = await createChecking(userId, "0");
    const savings = await createChecking(userId, "0");
    unwrap(
      await recordIncome(userId, {
        accountId: checking.id,
        categoryId: await categoryId(userId, "Sueldo"),
        amount: "1000000",
        date: TODAY,
        description: "Sueldo",
      }),
    );
    unwrap(
      await recordExpense(userId, {
        accountId: checking.id,
        categoryId: await categoryId(userId, "Supermercado"),
        amount: "250000",
        date: TODAY,
        description: "Súper",
      }),
    );
    unwrap(
      await recordTransfer(userId, {
        fromAccountId: checking.id,
        toAccountId: savings.id,
        amount: "300000",
        date: TODAY,
      }),
    );
    const person = unwrap(await createPerson(userId, { name: "Caro" }));
    unwrap(
      await createDebt(userId, {
        personId: person.id,
        direction: "THEY_OWE",
        amount: "50000",
        currency: "CLP",
        date: TODAY,
        description: "Préstamo",
        categoryId: await categoryId(userId, "Otros gastos"),
        accountId: checking.id,
      }),
    );

    const summary = await getMonthSummary(
      { id: userId, baseCurrency: "CLP" },
      monthOf(TODAY),
      TODAY,
    );
    expect(summary.income).toBe(1000000);
    expect(summary.expense).toBe(250000);
    expect(summary.savingsRate).toBe(0.75);
    expect(summary.missingRates).toEqual([]);
  });
});

describe("transactions lookup", () => {
  it("returns null for unknown ids", async () => {
    const userId = await createUser();
    expect(await getTransaction(userId, crypto.randomUUID())).toBeNull();
  });
});
