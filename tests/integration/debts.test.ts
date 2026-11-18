import { afterAll, describe, expect, it } from "vitest";
import {
  createDebt,
  createPerson,
  recordPayment,
  updateDebt,
  updatePayment,
} from "@/modules/debts/application/manage-debts";
import { getDebt } from "@/modules/debts";
import {
  NO_ACCOUNT,
  getCategoryBreakdown,
  getMonthSummary,
  getSpendingByAccount,
} from "@/modules/metrics/application/dashboard";
import { getAccountBalances } from "@/modules/transactions";
import { monthOf } from "@/shared/domain";
import { prisma } from "@/shared/infrastructure";
import { TODAY, categoryId, createChecking, createUser, unwrap } from "./helpers";

afterAll(() => prisma.$disconnect());

const viewer = (id: string) => ({ id, baseCurrency: "CLP" as const });
const month = monthOf(TODAY);

describe("debts in the monthly summary", () => {
  it("shows debts as pending and counts what I pay on them as spending", async () => {
    const userId = await createUser();
    const checking = await createChecking(userId, "500000");
    const ana = unwrap(await createPerson(userId, { name: "Ana" }));
    const restaurants = await categoryId(userId, "Restaurantes");

    // Ana paid my dinner: I owe it, but it is not spending yet.
    const dinner = unwrap(
      await createDebt(userId, {
        personId: ana.id,
        direction: "I_OWE",
        amount: "30000",
        currency: "CLP",
        date: TODAY,
        description: "Cena que pagó Ana",
        categoryId: restaurants,
      }),
    );
    // Ana lent me cash into my account: its payments are not spending either.
    const loan = unwrap(
      await createDebt(userId, {
        personId: ana.id,
        direction: "I_OWE",
        amount: "100000",
        currency: "CLP",
        date: TODAY,
        description: "Préstamo en efectivo",
        categoryId: await categoryId(userId, "Otros gastos"),
        accountId: checking.id,
      }),
    );
    // I lent money to Ana: pending to collect, never spending or income.
    const lent = unwrap(
      await createDebt(userId, {
        personId: ana.id,
        direction: "THEY_OWE",
        amount: "45000",
        currency: "CLP",
        date: TODAY,
        description: "Entradas",
        categoryId: await categoryId(userId, "Salidas"),
      }),
    );

    let summary = await getMonthSummary(viewer(userId), month, TODAY);
    expect(summary.expense).toBe(0);
    expect(summary.debts).toEqual({ owedToMe: 45000, iOwe: 130000 });

    // Paying part of the dinner from my account is spending in "Restaurantes".
    unwrap(
      await recordPayment(userId, dinner.debtId, {
        amount: "10000",
        date: TODAY,
        accountId: checking.id,
      }),
    );
    // Paying without registering an account also counts.
    unwrap(await recordPayment(userId, dinner.debtId, { amount: "5000", date: TODAY }));
    // Repaying the cash loan and being paid back by Ana do not count.
    unwrap(
      await recordPayment(userId, loan.debtId, {
        amount: "20000",
        date: TODAY,
        accountId: checking.id,
      }),
    );
    unwrap(await recordPayment(userId, lent.debtId, { amount: "45000", date: TODAY }));

    summary = await getMonthSummary(viewer(userId), month, TODAY);
    expect(summary.expense).toBe(15000);
    expect(summary.income).toBe(0);
    expect(summary.debts).toEqual({ owedToMe: 0, iOwe: 95000 });

    const { slices } = await getCategoryBreakdown(viewer(userId), month, TODAY);
    expect(slices).toHaveLength(1);
    expect(slices[0]!.name).toBe("Alimentación");
    expect(slices[0]!.children).toEqual([{ id: restaurants, name: "Restaurantes", amount: 15000 }]);

    const { accounts } = await getSpendingByAccount(viewer(userId), month, TODAY);
    expect(accounts.map((a) => [a.accountId, a.amount])).toEqual([
      [checking.id, 10000],
      [NO_ACCOUNT, 5000],
    ]);
  });
});

describe("editing debts", () => {
  it("rewrites the account movements when amount, direction and person change", async () => {
    const userId = await createUser();
    const checking = await createChecking(userId, "100000");
    const ana = unwrap(await createPerson(userId, { name: "Ana" }));
    const beto = unwrap(await createPerson(userId, { name: "Beto" }));
    const { debtId } = unwrap(
      await createDebt(userId, {
        personId: ana.id,
        direction: "THEY_OWE",
        amount: "20000",
        currency: "CLP",
        date: TODAY,
        description: "Préstamo",
        categoryId: await categoryId(userId, "Otros gastos"),
        accountId: checking.id,
      }),
    );
    unwrap(
      await recordPayment(userId, debtId, { amount: "5000", date: TODAY, accountId: checking.id }),
    );
    // 100.000 - 20.000 lent + 5.000 repaid
    expect((await getAccountBalances(userId, TODAY)).get(checking.id)?.posted).toBe(85000);

    unwrap(
      await updateDebt(userId, debtId, {
        personId: beto.id,
        direction: "I_OWE",
        amount: "30000",
        date: TODAY,
        description: "Préstamo de Beto",
        categoryId: await categoryId(userId, "Hogar"),
      }),
    );
    // Now Beto lent me 30.000 (+30.000) and I repaid 5.000 (-5.000).
    expect((await getAccountBalances(userId, TODAY)).get(checking.id)?.posted).toBe(125000);

    const debt = (await getDebt(userId, debtId))!;
    expect(debt.personId).toBe(beto.id);
    expect(debt.direction).toBe("I_OWE");
    expect(debt.principal).toBe(30000);
    expect(debt.categoryName).toBe("Hogar");
    expect(debt.costType).toBe("VARIABLE"); // inherited from "Compras"
    expect(debt.settled).toBe(false);
  });

  it("rejects an amount below what was already paid", async () => {
    const userId = await createUser();
    const ana = unwrap(await createPerson(userId, { name: "Ana" }));
    const otros = await categoryId(userId, "Otros gastos");
    const base = {
      personId: ana.id,
      direction: "THEY_OWE" as const,
      date: TODAY,
      description: "x",
      categoryId: otros,
    };
    const { debtId } = unwrap(
      await createDebt(userId, { ...base, amount: "10000", currency: "CLP" }),
    );
    unwrap(await recordPayment(userId, debtId, { amount: "6000", date: TODAY }));
    expect((await updateDebt(userId, debtId, { ...base, amount: "5000" })).ok).toBe(false);
    expect((await updateDebt(userId, debtId, { ...base, amount: "6000" })).ok).toBe(true);
    expect((await getDebt(userId, debtId))!.settled).toBe(true);
  });

  it("edits a payment, its account movement and the settled state", async () => {
    const userId = await createUser();
    const checking = await createChecking(userId, "0");
    const ana = unwrap(await createPerson(userId, { name: "Ana" }));
    const { debtId } = unwrap(
      await createDebt(userId, {
        personId: ana.id,
        direction: "THEY_OWE",
        amount: "20000",
        currency: "CLP",
        date: TODAY,
        description: "Préstamo",
        categoryId: await categoryId(userId, "Otros gastos"),
      }),
    );
    unwrap(
      await recordPayment(userId, debtId, { amount: "5000", date: TODAY, accountId: checking.id }),
    );
    const paymentId = (await getDebt(userId, debtId))!.payments[0]!.id;

    expect((await updatePayment(userId, paymentId, { amount: "20001", date: TODAY })).ok).toBe(
      false,
    );
    const result = unwrap(
      await updatePayment(userId, paymentId, { amount: "20000", date: TODAY, note: "Todo" }),
    );
    expect(result.settled).toBe(true);
    expect((await getAccountBalances(userId, TODAY)).get(checking.id)?.posted).toBe(20000);
    const debt = (await getDebt(userId, debtId))!;
    expect(debt.settled).toBe(true);
    expect(debt.payments[0]).toMatchObject({ amount: 20000, note: "Todo" });
  });
});
