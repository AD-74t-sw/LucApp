import { type LocalDate, addMonths, splitEvenly } from "@/shared/domain";

export const MAX_INSTALLMENTS = 60;

export type ScheduledInstallment = Readonly<{
  number: number;
  date: LocalDate;
  /** Positive amount in minor units. */
  amount: number;
}>;

/**
 * Monthly schedule for a purchase in installments. Amounts add up exactly to the
 * total (the rounding remainder goes to the first installment) and each charge
 * falls on the same day of the month as the first one, clamped to month end.
 */
export function buildInstallmentSchedule(
  total: number,
  count: number,
  firstChargeDate: LocalDate,
): ScheduledInstallment[] {
  if (!Number.isInteger(count) || count < 1 || count > MAX_INSTALLMENTS) {
    throw new RangeError(`count must be between 1 and ${MAX_INSTALLMENTS}`);
  }
  if (total <= 0) throw new RangeError("total must be positive");
  return splitEvenly(total, count).map((amount, index) => ({
    number: index + 1,
    date: addMonths(firstChargeDate, index),
    amount,
  }));
}

export type InstallmentPlan = Readonly<{
  id: string;
  accountId: string;
  cardId: string | null;
  categoryId: string;
  description: string;
  totalAmount: number;
  installmentCount: number;
  firstChargeDate: LocalDate;
}>;

export type InstallmentProgress = Readonly<{
  /** Installments whose date is on or before today. */
  charged: number;
  chargedAmount: number;
  remainingAmount: number;
  nextChargeDate: LocalDate | null;
}>;

export function installmentProgress(
  installments: readonly { date: LocalDate; amount: number }[],
  today: LocalDate,
): InstallmentProgress {
  const charged = installments.filter((i) => i.date <= today);
  const pending = installments
    .filter((i) => i.date > today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const chargedAmount = charged.reduce((sum, i) => sum + Math.abs(i.amount), 0);
  const remainingAmount = pending.reduce((sum, i) => sum + Math.abs(i.amount), 0);
  return {
    charged: charged.length,
    chargedAmount,
    remainingAmount,
    nextChargeDate: pending[0]?.date ?? null,
  };
}
