import { describe, expect, it } from "vitest";
import type { LocalDate } from "@/shared/domain";
import {
  type Debt,
  accountMovementAmount,
  balancesByCurrency,
  paymentsCountAsSpending,
  isOverdue,
  outstanding,
  validatePayment,
  validatePaymentChange,
  validatePrincipal,
} from "./debt";

function debt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: "d1",
    personId: "p1",
    direction: "THEY_OWE",
    principal: 10000,
    currency: "CLP",
    date: "2026-11-01" as LocalDate,
    dueDate: null,
    description: "Cena",
    categoryId: "cat",
    costType: null,
    necessity: null,
    settled: false,
    transactionId: null,
    payments: [],
    ...overrides,
  };
}

const payment = (amount: number) => ({
  id: `p${amount}`,
  debtId: "d1",
  amount,
  date: "2026-11-10" as LocalDate,
  note: null,
  transactionId: null,
});

describe("debts", () => {
  it("computes what is left after partial payments", () => {
    expect(outstanding(debt({ payments: [payment(3000), payment(2000)] }))).toBe(5000);
  });

  it("does not allow paying more than what is left", () => {
    const d = debt({ payments: [payment(8000)] });
    expect(validatePayment(d, 2000).ok).toBe(true);
    expect(validatePayment(d, 2001).ok).toBe(false);
    expect(validatePayment(d, 0).ok).toBe(false);
  });

  it("signs account movements by direction and event", () => {
    expect(accountMovementAmount("THEY_OWE", "open", 100)).toBe(-100); // I lend: money leaves
    expect(accountMovementAmount("THEY_OWE", "payment", 100)).toBe(100); // they repay: money enters
    expect(accountMovementAmount("I_OWE", "open", 100)).toBe(100); // I borrow: money enters
    expect(accountMovementAmount("I_OWE", "payment", 100)).toBe(-100); // I repay: money leaves
  });

  it("nets balances per currency without mixing currencies", () => {
    const balances = balancesByCurrency([
      debt({ principal: 10000 }),
      debt({ id: "d2", direction: "I_OWE", principal: 4000 }),
      debt({ id: "d3", currency: "USD", principal: 500 }),
      debt({ id: "d4", principal: 1000, payments: [payment(1000)] }),
    ]);
    expect(balances).toEqual([
      { currency: "CLP", owedToMe: 10000, iOwe: 4000, net: 6000 },
      { currency: "USD", owedToMe: 500, iOwe: 0, net: 500 },
    ]);
  });

  it("flags unpaid debts past their due date", () => {
    const today = "2026-11-14" as LocalDate;
    expect(isOverdue(debt({ dueDate: "2026-11-13" as LocalDate }), today)).toBe(true);
    expect(isOverdue(debt({ dueDate: "2026-11-13" as LocalDate, settled: true }), today)).toBe(
      false,
    );
    expect(isOverdue(debt(), today)).toBe(false);
  });

  it("counts payments as spending only for debts I owe that were not cash loans", () => {
    expect(paymentsCountAsSpending({ direction: "I_OWE", transactionId: null })).toBe(true);
    // A cash loan that entered my account: what I buy with it is its own expense.
    expect(paymentsCountAsSpending({ direction: "I_OWE", transactionId: "t1" })).toBe(false);
    expect(paymentsCountAsSpending({ direction: "THEY_OWE", transactionId: null })).toBe(false);
  });

  it("never lets the amount drop below what was paid", () => {
    expect(validatePrincipal(5000, 3000).ok).toBe(true);
    expect(validatePrincipal(3000, 3000).ok).toBe(true);
    expect(validatePrincipal(2999, 3000).ok).toBe(false);
    expect(validatePrincipal(0, 0).ok).toBe(false);
  });

  it("validates an edited payment against the other payments", () => {
    const d = debt({ principal: 10000, payments: [payment(4000), payment(5000)] });
    expect(validatePaymentChange(d, "p4000", 5000).ok).toBe(true);
    expect(validatePaymentChange(d, "p4000", 5001).ok).toBe(false);
    expect(validatePaymentChange(d, "p4000", 0).ok).toBe(false);
  });
});
