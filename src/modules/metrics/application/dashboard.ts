import { type Account, isCreditAccount, listAccounts } from "@/modules/accounts";
import { type RateTable, getRateTable } from "@/modules/currencies";
import { getDebtTotals } from "@/modules/debts";
import type { CurrentUser } from "@/modules/identity";
import { type AccountBalance, getAccountBalances } from "@/modules/transactions";
import {
  type CurrencyCode,
  type LocalDate,
  type MonthKey,
  addMonths,
  addMonthsToKey,
  firstDayOfMonth,
  lastDayOfMonth,
  minDate,
  monthOf,
  monthsEndingAt,
} from "@/shared/domain";
import {
  BaseCurrencySum,
  type CategorySlice,
  type ClassificationSplit,
  rollupByParent,
  savingsRate,
  splitByClassification,
} from "../domain/aggregation";
import { valueCardCharges } from "../domain/card-settlement";
import { type ForeignCardRow, metricsQueries } from "../infrastructure/metrics-queries";

/**
 * Dashboard figures, always expressed in the user's base currency. Each function
 * is independent so the page can stream every section on its own.
 *
 * Conversion rules (CLP <-> USD, "dólar observado"):
 * - Balances and future installments: today's rate.
 * - Movements of a month: the rate of its last day (or today, if earlier).
 * - Credit card purchases in the other currency: today's rate while unpaid,
 *   then what was actually paid for them (see `valueCardCharges`).
 */

type Viewer = Pick<CurrentUser, "id" | "baseCurrency">;
type Range = { from: LocalDate; to: LocalDate };

/** Synthetic ids for spending without category (old debts) or account (unregistered debt payments). */
const UNCATEGORIZED = "uncategorized";
export const NO_ACCOUNT = "no-account";

type WithMissing<T> = T & { missingRates: CurrencyCode[] };

async function converter(viewer: Viewer, from?: LocalDate) {
  const rates = await getRateTable(from ? { from } : {});
  const sum = new BaseCurrencySum((amount, currency, date) =>
    rates.convert(amount, currency, viewer.baseCurrency, date),
  );
  return { rates, sum };
}

/** Amounts of a month are converted with the rate of its last day (or today, if earlier). */
function conversionDate(month: MonthKey, today: LocalDate): LocalDate {
  return minDate(lastDayOfMonth(month), today);
}

function monthRange(month: MonthKey): Range {
  return { from: firstDayOfMonth(month), to: lastDayOfMonth(month) };
}

const inRange = (date: LocalDate, range: Range) => date >= range.from && date <= range.to;

/** A card purchase in a foreign currency, valued in the base currency. */
type ValuedCardCharge = ForeignCardRow & { baseAmount: number };

/**
 * Values every card purchase made in a currency other than the base one. Each
 * card's foreign debt is settled oldest first by its payments; the paid part is
 * worth what it cost, the unpaid part today's rate.
 */
async function valuedForeignCardCharges(
  viewer: Viewer,
  rates: RateTable,
  sum: BaseCurrencySum,
  today: LocalDate,
): Promise<ValuedCardCharge[]> {
  const [rows, accounts] = await Promise.all([
    metricsQueries.foreignCardMovements(viewer.id, viewer.baseCurrency),
    listAccounts(viewer.id, { includeArchived: true }),
  ]);
  const groups = new Map<string, ForeignCardRow[]>();
  for (const row of rows) {
    const key = `${row.accountId}|${row.currency}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const valued: ValuedCardCharge[] = [];
  for (const group of groups.values()) {
    const { accountId, currency } = group[0]!;
    const account = accounts.find((a) => a.id === accountId);
    const opening =
      account?.currency === currency
        ? account.openingBalance
        : account?.secondaryCurrency === currency
          ? account.secondaryOpeningBalance
          : 0;
    const values = valueCardCharges({
      openingDebt: -opening,
      charges: group
        .filter((r) => r.amount < 0)
        .map((r) => ({ id: r.id, date: r.date, amount: -r.amount })),
      payments: group
        .filter((r) => r.amount > 0)
        .map((r) => ({
          date: r.date,
          amount: r.amount,
          baseAmount:
            r.counterCurrency === viewer.baseCurrency && r.counterAmount !== null
              ? Math.abs(r.counterAmount)
              : null,
        })),
      convert: (amount, date) => rates.convert(amount, currency, viewer.baseCurrency, date),
      today,
    });
    for (const row of group) {
      if (row.kind !== "EXPENSE" || row.amount >= 0) continue;
      const value = values.get(row.id);
      if (value === null || value === undefined) sum.markMissing(currency);
      else valued.push({ ...row, baseAmount: value });
    }
  }
  return valued;
}

export type MonthSummary = WithMissing<{
  income: number;
  expense: number;
  net: number;
  savingsRate: number | null;
  previous: { income: number; expense: number };
  /** Pending debts today, in the base currency: shown to keep them in mind, not spending. */
  debts: { owedToMe: number; iOwe: number };
}>;

/** Income and spending per month in the base currency, card purchases included. */
async function monthTotals(viewer: Viewer, months: readonly MonthKey[], today: LocalDate) {
  const range = { from: firstDayOfMonth(months[0]!), to: lastDayOfMonth(months.at(-1)!) };
  const { rates, sum } = await converter(viewer, range.from);
  const [rows, cardCharges] = await Promise.all([
    metricsQueries.monthlyTotals(viewer.id, range, viewer.baseCurrency),
    valuedForeignCardCharges(viewer, rates, sum, today),
  ]);
  const totals = new Map(
    months.map((month) => {
      const date = conversionDate(month, today);
      const fromRows = rows
        .filter((r) => r.month === month)
        .reduce(
          (acc, r) => ({
            income: acc.income + sum.of(r.income, r.currency, date),
            expense: acc.expense + sum.of(r.expense, r.currency, date),
          }),
          { income: 0, expense: 0 },
        );
      const cards = cardCharges
        .filter((c) => monthOf(c.date) === month)
        .reduce((acc, c) => acc + c.baseAmount, 0);
      return [month, { income: fromRows.income, expense: fromRows.expense + cards }];
    }),
  );
  return { totals, sum };
}

export async function getMonthSummary(
  viewer: Viewer,
  month: MonthKey,
  today: LocalDate,
): Promise<MonthSummary> {
  const previousMonth = addMonthsToKey(month, -1);
  const [{ totals, sum }, debtTotals] = await Promise.all([
    monthTotals(viewer, [previousMonth, month], today),
    getDebtTotals(viewer.id),
  ]);
  const current = totals.get(month)!;
  return {
    ...current,
    net: current.income - current.expense,
    savingsRate: savingsRate(current.income, current.expense),
    previous: totals.get(previousMonth)!,
    debts: {
      owedToMe: debtTotals.reduce((acc, d) => acc + sum.of(d.owedToMe, d.currency, today), 0),
      iOwe: debtTotals.reduce((acc, d) => acc + sum.of(d.iOwe, d.currency, today), 0),
    },
    missingRates: [...sum.missing],
  };
}

export type TrendPoint = { month: MonthKey; income: number; expense: number };

export async function getMonthlyTrend(
  viewer: Viewer,
  lastMonth: MonthKey,
  today: LocalDate,
  months = 12,
): Promise<WithMissing<{ points: TrendPoint[] }>> {
  const keys = monthsEndingAt(lastMonth, months);
  const { totals, sum } = await monthTotals(viewer, keys, today);
  return {
    points: keys.map((month) => ({ month, ...totals.get(month)! })),
    missingRates: [...sum.missing],
  };
}

export async function getCategoryBreakdown(
  viewer: Viewer,
  month: MonthKey,
  today: LocalDate,
): Promise<WithMissing<{ slices: CategorySlice[]; total: number }>> {
  const range = monthRange(month);
  const { rates, sum } = await converter(viewer, range.from);
  const [rows, cardCharges] = await Promise.all([
    metricsQueries.spendingByCategory(viewer.id, range, viewer.baseCurrency),
    valuedForeignCardCharges(viewer, rates, sum, today),
  ]);
  const date = conversionDate(month, today);
  const slices = rollupByParent([
    ...rows.map((r) => ({
      ...r,
      categoryId: r.categoryId ?? UNCATEGORIZED,
      amount: sum.of(r.amount, r.currency, date),
    })),
    ...cardCharges
      .filter((c) => inRange(c.date, range))
      .map((c) => ({
        categoryId: c.categoryId ?? UNCATEGORIZED,
        name: c.name ?? "Sin categoría",
        color: c.color ?? "#9aa3b2",
        parentId: c.parentId,
        parentName: c.parentName,
        parentColor: c.parentColor,
        amount: c.baseAmount,
      })),
  ]);
  return {
    slices,
    total: slices.reduce((acc, s) => acc + s.amount, 0),
    missingRates: [...sum.missing],
  };
}

export async function getClassificationBreakdown(
  viewer: Viewer,
  month: MonthKey,
  today: LocalDate,
): Promise<WithMissing<{ split: ClassificationSplit; total: number }>> {
  const range = monthRange(month);
  const { rates, sum } = await converter(viewer, range.from);
  const [rows, cardCharges] = await Promise.all([
    metricsQueries.spendingByClassification(viewer.id, range, viewer.baseCurrency),
    valuedForeignCardCharges(viewer, rates, sum, today),
  ]);
  const date = conversionDate(month, today);
  const converted = [
    ...rows.map((r) => ({ ...r, amount: sum.of(r.amount, r.currency, date) })),
    ...cardCharges
      .filter((c) => inRange(c.date, range))
      .map((c) => ({ costType: c.costType, necessity: c.necessity, amount: c.baseAmount })),
  ];
  return {
    split: splitByClassification(converted),
    total: converted.reduce((acc, r) => acc + r.amount, 0),
    missingRates: [...sum.missing],
  };
}

export type AccountSpend = {
  accountId: string;
  name: string;
  amount: number;
  cards: { cardId: string | null; name: string; amount: number }[];
};

export async function getSpendingByAccount(
  viewer: Viewer,
  month: MonthKey,
  today: LocalDate,
): Promise<WithMissing<{ accounts: AccountSpend[] }>> {
  const range = monthRange(month);
  const { rates, sum } = await converter(viewer, range.from);
  const [rows, cardCharges] = await Promise.all([
    metricsQueries.spendingByAccount(viewer.id, range, viewer.baseCurrency),
    valuedForeignCardCharges(viewer, rates, sum, today),
  ]);
  const date = conversionDate(month, today);
  const items = [
    ...rows.map((r) => ({ ...r, amount: sum.of(r.amount, r.currency, date) })),
    ...cardCharges
      .filter((c) => inRange(c.date, range))
      .map((c) => ({
        accountId: c.accountId,
        accountName: c.accountName,
        cardId: c.cardId,
        cardName: c.cardName,
        amount: c.baseAmount,
      })),
  ];
  const byAccount = new Map<string, AccountSpend>();
  for (const item of items) {
    // Debt payments not registered on an account.
    const accountId = item.accountId ?? NO_ACCOUNT;
    const entry = byAccount.get(accountId) ?? {
      accountId,
      name: item.accountName ?? "Abonos a deudas sin cuenta",
      amount: 0,
      cards: [],
    };
    entry.amount += item.amount;
    if (item.accountId) {
      const card = entry.cards.find((c) => c.cardId === item.cardId);
      if (card) card.amount += item.amount;
      else {
        entry.cards.push({
          cardId: item.cardId,
          name: item.cardName ?? "Sin tarjeta",
          amount: item.amount,
        });
      }
    }
    byAccount.set(accountId, entry);
  }
  const accounts = [...byAccount.values()]
    .map((a) => ({ ...a, cards: a.cards.sort((x, y) => y.amount - x.amount) }))
    .sort((a, b) => b.amount - a.amount);
  return { accounts, missingRates: [...sum.missing] };
}

export type CreditCardStatus = { account: Account; balance: AccountBalance };

export type NetWorth = WithMissing<{
  total: number;
  assets: number;
  liabilities: number;
  owedToMe: number;
  iOwe: number;
  creditCards: CreditCardStatus[];
}>;

/** What you have minus what you owe, today, including people's debts. */
export async function getNetWorth(viewer: Viewer, today: LocalDate): Promise<NetWorth> {
  const [{ sum }, accounts, balances, debts] = await Promise.all([
    converter(viewer),
    listAccounts(viewer.id, { includeArchived: true }),
    getAccountBalances(viewer.id, today),
    getDebtTotals(viewer.id),
  ]);
  let assets = 0;
  let liabilities = 0;
  const add = (amount: number, currency: CurrencyCode) => {
    const value = sum.of(amount, currency, today);
    if (value >= 0) assets += value;
    else liabilities += -value;
  };
  const creditCards: CreditCardStatus[] = [];
  for (const account of accounts) {
    const balance = balances.get(account.id);
    if (!balance) continue;
    add(balance.posted, account.currency);
    if (balance.secondary) add(balance.secondary.posted, balance.secondary.currency);
    if (isCreditAccount(account.type) && !account.archived) creditCards.push({ account, balance });
  }
  const owedToMe = debts.reduce((acc, d) => acc + sum.of(d.owedToMe, d.currency, today), 0);
  const iOwe = debts.reduce((acc, d) => acc + sum.of(d.iOwe, d.currency, today), 0);
  return {
    total: assets - liabilities + owedToMe - iOwe,
    assets,
    liabilities,
    owedToMe,
    iOwe,
    creditCards,
    missingRates: [...sum.missing],
  };
}

/** Installments still to be charged, per month, for the next `months` months (today's rate). */
export async function getUpcomingCommitments(
  viewer: Viewer,
  today: LocalDate,
  months = 12,
): Promise<WithMissing<{ points: { month: MonthKey; amount: number }[]; total: number }>> {
  const until = lastDayOfMonth(monthOf(addMonths(today, months - 1)));
  const [{ sum }, rows] = await Promise.all([
    converter(viewer),
    metricsQueries.upcomingInstallments(viewer.id, today, until),
  ]);
  const points = monthsEndingAt(monthOf(until), months).map((month) => ({
    month,
    amount: rows
      .filter((r) => r.month === month)
      .reduce((acc, r) => acc + sum.of(r.amount, r.currency, today), 0),
  }));
  return {
    points,
    total: points.reduce((acc, p) => acc + p.amount, 0),
    missingRates: [...sum.missing],
  };
}
