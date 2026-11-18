import { resolveClassification } from "@/modules/categories";
import { type Result, notFound, ok } from "@/shared/domain";
import { runInTransaction } from "@/shared/infrastructure";
import { buildInstallmentSchedule } from "../domain/installment-schedule";
import { installmentRepository } from "../infrastructure/installment-repository";
import { transactionRepository } from "../infrastructure/transaction-repository";
import {
  loadActiveAccount,
  loadCardForAccount,
  loadCategoryOfKind,
  parsePositiveAmount,
  resolveCurrency,
} from "./context";
import type { InstallmentPurchaseInput } from "./transaction-schemas";

/**
 * Registers a purchase paid in N monthly installments: one plan plus one real
 * expense per installment, so monthly spending and future commitments both come
 * from the same movements table.
 */
export async function createInstallmentPurchase(
  userId: string,
  input: InstallmentPurchaseInput,
): Promise<Result<{ planId: string }>> {
  const account = await loadActiveAccount(userId, input.accountId);
  if (!account.ok) return account;
  const card = await loadCardForAccount(userId, input.cardId, account.value);
  if (!card.ok) return card;
  const category = await loadCategoryOfKind(userId, input.categoryId, "EXPENSE");
  if (!category.ok) return category;
  const currency = resolveCurrency(account.value, input.currency);
  if (!currency.ok) return currency;
  const total = parsePositiveAmount(input.totalAmount, currency.value, "totalAmount");
  if (!total.ok) return total;

  const classification = resolveClassification(category.value.category, category.value.parent, {
    costType: input.costType,
    necessity: input.necessity,
  });
  const schedule = buildInstallmentSchedule(
    total.value,
    input.installmentCount,
    input.firstChargeDate,
  );

  const planId = await runInTransaction(async (tx) => {
    const id = await installmentRepository.create(
      userId,
      {
        accountId: account.value.id,
        cardId: card.value?.id ?? null,
        categoryId: category.value.category.id,
        description: input.description,
        totalAmount: total.value,
        currency: currency.value,
        installmentCount: input.installmentCount,
        firstChargeDate: input.firstChargeDate,
        ...classification,
      },
      tx,
    );
    await transactionRepository.createMany(
      userId,
      schedule.map((installment) => ({
        accountId: account.value.id,
        cardId: card.value?.id ?? null,
        kind: "EXPENSE" as const,
        amount: -installment.amount,
        currency: currency.value,
        date: installment.date,
        description: `${input.description} (${installment.number}/${input.installmentCount})`,
        categoryId: category.value.category.id,
        ...classification,
        installmentPlanId: id,
        installmentNumber: installment.number,
      })),
      tx,
    );
    return id;
  });
  return ok({ planId });
}

/** Removes the purchase and all its installments. */
export async function deleteInstallmentPlan(userId: string, planId: string): Promise<Result<void>> {
  if (!(await installmentRepository.exists(userId, planId))) return notFound("La compra en cuotas");
  await installmentRepository.delete(userId, planId);
  return ok();
}
