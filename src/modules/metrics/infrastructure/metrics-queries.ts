import { Prisma } from "@/generated/prisma/client";
import type { CostType, Necessity } from "@/modules/categories";
import { type CurrencyCode, type LocalDate, type MonthKey, toCurrencyCode } from "@/shared/domain";
import { prisma, toDbDate, toLocalDate, toMinor } from "@/shared/infrastructure";

/**
 * Read-only aggregations for the dashboard. This is the one place allowed to
 * query other modules' tables directly: it never writes, and aggregating in SQL
 * keeps the dashboard fast no matter how many movements exist.
 *
 * What counts:
 * - Income: INCOME movements.
 * - Spending: EXPENSE movements, plus what I pay on debts I owe, in the debt's
 *   category, on the payment date (see `paymentsCountAsSpending` in the debts
 *   module). A debt itself is never spending; it is shown as pending.
 * - Transfers, card payments, cash loans and money I am paid back only move
 *   money between places, so they are never income or spending.
 */

type Range = { from: LocalDate; to: LocalDate };

/**
 * Every spending item in the range, from both sources, with the same columns.
 * A debt payment takes its account from its movement, if it was registered on one.
 */
function spendingSource(userId: string, range: Range, base: CurrencyCode): Prisma.Sql {
  const from = toDbDate(range.from);
  const to = toDbDate(range.to);
  // Card purchases in a foreign currency are valued separately (until paid they
  // take today's rate, then what was actually paid): see `foreignCardMovements`.
  return Prisma.sql`
    SELECT t.date, t.currency, -t.amount AS amount, t."categoryId",
           t."costType"::text AS "costType", t.necessity::text AS necessity,
           t."accountId", t."cardId"
    FROM app.transactions t
    JOIN app.financial_accounts fa ON fa.id = t."accountId"
    WHERE t."userId" = ${userId}::uuid
      AND t.kind = 'EXPENSE'
      AND NOT (fa.type = 'CREDIT_CARD' AND t.currency <> ${base})
      AND t.date BETWEEN ${from}::date AND ${to}::date
    UNION ALL
    SELECT p.date, d.currency, p.amount, d."categoryId",
           d."costType"::text, d.necessity::text,
           pt."accountId", NULL::uuid
    FROM app.debt_payments p
    JOIN app.debts d ON d.id = p."debtId"
    LEFT JOIN app.transactions pt ON pt.id = p."transactionId"
    WHERE p."userId" = ${userId}::uuid
      AND d.direction = 'I_OWE'
      AND d."transactionId" IS NULL
      AND p.date BETWEEN ${from}::date AND ${to}::date`;
}

export type MonthlyTotalRow = {
  month: MonthKey;
  currency: CurrencyCode;
  income: number;
  expense: number;
};

export type CategoryRow = {
  /** Null for debts created before categories were required. */
  categoryId: string | null;
  name: string;
  color: string;
  parentId: string | null;
  parentName: string | null;
  parentColor: string | null;
  currency: CurrencyCode;
  /** Positive amount spent. */
  amount: number;
};

export type ClassificationRow = {
  costType: CostType | null;
  necessity: Necessity | null;
  currency: CurrencyCode;
  amount: number;
};

export type AccountSpendRow = {
  /** Null for debt payments that were not registered on an account. */
  accountId: string | null;
  accountName: string | null;
  cardId: string | null;
  cardName: string | null;
  currency: CurrencyCode;
  amount: number;
};

export type CommitmentRow = { month: MonthKey; currency: CurrencyCode; amount: number };

export type ForeignCardRow = {
  id: string;
  kind: string;
  /** Signed, in `currency` minor units (negative = charge). */
  amount: number;
  currency: CurrencyCode;
  date: LocalDate;
  accountId: string;
  accountName: string;
  cardId: string | null;
  cardName: string | null;
  categoryId: string | null;
  name: string | null;
  color: string | null;
  parentId: string | null;
  parentName: string | null;
  parentColor: string | null;
  costType: CostType | null;
  necessity: Necessity | null;
  /** Other leg of a transfer (what a payment cost), if any. */
  counterCurrency: CurrencyCode | null;
  counterAmount: number | null;
};

export const metricsQueries = {
  async monthlyTotals(
    userId: string,
    range: Range,
    base: CurrencyCode,
  ): Promise<MonthlyTotalRow[]> {
    const rows = await prisma.$queryRaw<
      { month: string; currency: string; income: bigint; expense: bigint }[]
    >`
      WITH spending AS (${spendingSource(userId, range, base)}),
      income AS (
        SELECT t.date, t.currency, t.amount
        FROM app.transactions t
        WHERE t."userId" = ${userId}::uuid
          AND t.kind = 'INCOME'
          AND t.date BETWEEN ${toDbDate(range.from)}::date AND ${toDbDate(range.to)}::date
      )
      SELECT month, currency, SUM(income)::bigint AS income, SUM(expense)::bigint AS expense
      FROM (
        SELECT to_char(date, 'YYYY-MM') AS month, currency, amount AS income, 0::bigint AS expense FROM income
        UNION ALL
        SELECT to_char(date, 'YYYY-MM'), currency, 0::bigint, amount FROM spending
      ) totals
      GROUP BY month, currency
      ORDER BY month`;
    return rows.map((r) => ({
      month: r.month as MonthKey,
      currency: toCurrencyCode(r.currency),
      income: toMinor(r.income),
      expense: toMinor(r.expense),
    }));
  },

  async spendingByCategory(
    userId: string,
    range: Range,
    base: CurrencyCode,
  ): Promise<CategoryRow[]> {
    const rows = await prisma.$queryRaw<
      {
        categoryId: string | null;
        name: string | null;
        color: string | null;
        parentId: string | null;
        parentName: string | null;
        parentColor: string | null;
        currency: string;
        amount: bigint;
      }[]
    >`
      WITH spending AS (${spendingSource(userId, range, base)})
      SELECT c.id AS "categoryId", c.name, c.color,
             p.id AS "parentId", p.name AS "parentName", p.color AS "parentColor",
             s.currency, SUM(s.amount)::bigint AS amount
      FROM spending s
      LEFT JOIN app.categories c ON c.id = s."categoryId"
      LEFT JOIN app.categories p ON p.id = c."parentId"
      GROUP BY c.id, p.id, s.currency`;
    return rows.map((r) => ({
      ...r,
      name: r.name ?? "Sin categoría",
      color: r.color ?? "#9aa3b2",
      currency: toCurrencyCode(r.currency),
      amount: toMinor(r.amount),
    }));
  },

  async spendingByClassification(
    userId: string,
    range: Range,
    base: CurrencyCode,
  ): Promise<ClassificationRow[]> {
    const rows = await prisma.$queryRaw<
      { costType: CostType | null; necessity: Necessity | null; currency: string; amount: bigint }[]
    >`
      WITH spending AS (${spendingSource(userId, range, base)})
      SELECT "costType", necessity, currency, SUM(amount)::bigint AS amount
      FROM spending
      GROUP BY 1, 2, 3`;
    return rows.map((r) => ({
      ...r,
      currency: toCurrencyCode(r.currency),
      amount: toMinor(r.amount),
    }));
  },

  async spendingByAccount(
    userId: string,
    range: Range,
    base: CurrencyCode,
  ): Promise<AccountSpendRow[]> {
    const rows = await prisma.$queryRaw<
      {
        accountId: string | null;
        accountName: string | null;
        cardId: string | null;
        cardName: string | null;
        currency: string;
        amount: bigint;
      }[]
    >`
      WITH spending AS (${spendingSource(userId, range, base)})
      SELECT a.id AS "accountId", a.name AS "accountName",
             cd.id AS "cardId", cd.name AS "cardName",
             s.currency, SUM(s.amount)::bigint AS amount
      FROM spending s
      LEFT JOIN app.financial_accounts a ON a.id = s."accountId"
      LEFT JOIN app.cards cd ON cd.id = s."cardId"
      GROUP BY a.id, cd.id, s.currency`;
    return rows.map((r) => ({
      ...r,
      currency: toCurrencyCode(r.currency),
      amount: toMinor(r.amount),
    }));
  },

  /**
   * Every movement of credit cards in a currency other than `base`, with what
   * the dashboard needs to value and group them, and for payments (transfers)
   * the other leg, to know what they actually cost.
   */
  async foreignCardMovements(userId: string, base: CurrencyCode): Promise<ForeignCardRow[]> {
    const rows = await prisma.$queryRaw<
      (Omit<
        ForeignCardRow,
        "currency" | "amount" | "date" | "counterCurrency" | "counterAmount"
      > & {
        currency: string;
        amount: bigint;
        date: Date;
        counterCurrency: string | null;
        counterAmount: bigint | null;
      })[]
    >`
      SELECT t.id, t.kind::text AS kind, t.amount, t.currency, t.date,
             t."accountId", a.name AS "accountName", t."cardId", cd.name AS "cardName",
             c.id AS "categoryId", c.name, c.color,
             p.id AS "parentId", p.name AS "parentName", p.color AS "parentColor",
             t."costType"::text AS "costType", t.necessity::text AS necessity,
             o.currency AS "counterCurrency", o.amount AS "counterAmount"
      FROM app.transactions t
      JOIN app.financial_accounts a ON a.id = t."accountId" AND a.type = 'CREDIT_CARD'
      LEFT JOIN app.cards cd ON cd.id = t."cardId"
      LEFT JOIN app.categories c ON c.id = t."categoryId"
      LEFT JOIN app.categories p ON p.id = c."parentId"
      LEFT JOIN LATERAL (
        SELECT other.currency, other.amount
        FROM app.transactions other
        WHERE t."transferGroupId" IS NOT NULL
          AND other."transferGroupId" = t."transferGroupId"
          AND other.id <> t.id
        LIMIT 1
      ) o ON TRUE
      WHERE t."userId" = ${userId}::uuid
        AND t.currency <> ${base}
      ORDER BY t.date, t."createdAt"`;
    return rows.map((r) => ({
      ...r,
      currency: toCurrencyCode(r.currency),
      amount: toMinor(r.amount),
      date: toLocalDate(r.date),
      counterCurrency: r.counterCurrency ? toCurrencyCode(r.counterCurrency) : null,
      counterAmount: r.counterAmount === null ? null : toMinor(r.counterAmount),
    }));
  },

  /** Installments dated after `today`, per month. */
  async upcomingInstallments(
    userId: string,
    today: LocalDate,
    until: LocalDate,
  ): Promise<CommitmentRow[]> {
    const rows = await prisma.$queryRaw<{ month: string; currency: string; amount: bigint }[]>`
      SELECT to_char(t.date, 'YYYY-MM') AS month, t.currency, (-SUM(t.amount))::bigint AS amount
      FROM app.transactions t
      WHERE t."userId" = ${userId}::uuid
        AND t."installmentPlanId" IS NOT NULL
        AND t.date > ${toDbDate(today)}::date
        AND t.date <= ${toDbDate(until)}::date
      GROUP BY 1, 2
      ORDER BY 1`;
    return rows.map((r) => ({
      month: r.month as MonthKey,
      currency: toCurrencyCode(r.currency),
      amount: toMinor(r.amount),
    }));
  },
};
