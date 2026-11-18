import { listAccounts } from "@/modules/accounts";
import { listCategories } from "@/modules/categories";
import { type CurrencyCode, type LocalDate, type Page, addDays, pageOf } from "@/shared/domain";
import type { AccountBalance } from "../domain/balance";
import { type InstallmentProgress, installmentProgress } from "../domain/installment-schedule";
import type { Transaction } from "../domain/transaction";
import {
  type InstallmentPlanDetails,
  installmentRepository,
} from "../infrastructure/installment-repository";
import {
  type TransactionListItem,
  transactionRepository,
} from "../infrastructure/transaction-repository";
import type { TransactionFiltersInput } from "./transaction-schemas";

export const PAGE_SIZE = 30;

/**
 * Lists movements. Unless asked otherwise, future-dated movements (upcoming
 * installments) are hidden so the list shows what already happened.
 */
/**
 * Movements already recorded with this amount around a date, to warn before
 * recording a bank notice twice (for example, once by hand and once from the inbox).
 */
export function findSimilarTransactions(
  userId: string,
  query: { amount: number; currency: CurrencyCode; date: LocalDate },
): Promise<Transaction[]> {
  return transactionRepository.findByAmount(
    userId,
    Math.abs(query.amount),
    query.currency,
    addDays(query.date, -1),
    addDays(query.date, 1),
  );
}

export async function listTransactions(
  userId: string,
  filters: TransactionFiltersInput,
  today: LocalDate,
): Promise<Page<TransactionListItem>> {
  let { from, to } = filters;
  if (filters.scheduled === undefined) {
    to = to && to < today ? to : today;
  } else if (filters.scheduled === "only") {
    const tomorrow = addDays(today, 1);
    from = from && from > tomorrow ? from : tomorrow;
  }

  // Filtering by a parent category also includes its subcategories.
  let categoryIds: string[] | undefined;
  if (filters.categoryId) {
    const categories = await listCategories(userId, { includeArchived: true });
    categoryIds = categories
      .filter((c) => c.id === filters.categoryId || c.parentId === filters.categoryId)
      .map((c) => c.id);
  }
  const { items, total } = await transactionRepository.list(
    userId,
    {
      from,
      to,
      accountId: filters.accountId,
      cardId: filters.cardId,
      categoryIds,
      kind: filters.kind,
      costType: filters.costType,
      necessity: filters.necessity,
      search: filters.q,
    },
    filters.page,
    PAGE_SIZE,
  );
  return pageOf(items, filters.page, PAGE_SIZE, total);
}

export function getTransaction(userId: string, id: string): Promise<Transaction | null> {
  return transactionRepository.findById(userId, id);
}

/** Current balance of every account (including archived ones), opening balance included. */
export async function getAccountBalances(
  userId: string,
  today: LocalDate,
): Promise<Map<string, AccountBalance>> {
  const [accounts, sums] = await Promise.all([
    listAccounts(userId, { includeArchived: true }),
    transactionRepository.balances(userId, today),
  ]);
  return new Map(
    accounts.map((account) => {
      const byCurrency = sums.get(account.id);
      const amounts = (currency: CurrencyCode, opening: number) => ({
        posted: opening + (byCurrency?.get(currency)?.posted ?? 0),
        scheduled: byCurrency?.get(currency)?.scheduled ?? 0,
      });
      const balance: AccountBalance = {
        accountId: account.id,
        currency: account.currency,
        ...amounts(account.currency, account.openingBalance),
        secondary: account.secondaryCurrency
          ? {
              currency: account.secondaryCurrency,
              ...amounts(account.secondaryCurrency, account.secondaryOpeningBalance),
            }
          : null,
      };
      return [account.id, balance];
    }),
  );
}

export type InstallmentPlanSummary = InstallmentPlanDetails & { progress: InstallmentProgress };

export async function listInstallmentPlans(
  userId: string,
  today: LocalDate,
): Promise<InstallmentPlanSummary[]> {
  const plans = await installmentRepository.list(userId);
  return plans.map((plan) => ({
    ...plan,
    progress: installmentProgress(plan.installments, today),
  }));
}
