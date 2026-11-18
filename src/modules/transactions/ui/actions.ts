"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/modules/identity";
import type { ActionState } from "@/shared/ui/action-state";
import { errorState, parseForm, successState } from "@/shared/ui/server/form";
import { createInstallmentPurchase, deleteInstallmentPlan } from "../application/installments";
import {
  deleteTransaction,
  recordExpense,
  recordIncome,
  updateTransaction,
} from "../application/record-transaction";
import { recordTransfer } from "../application/record-transfer";
import {
  expenseSchema,
  incomeSchema,
  installmentPurchaseSchema,
  transferSchema,
  updateTransactionSchema,
} from "../application/transaction-schemas";

const uuid = z.uuid();

function done(path = "/transactions"): never {
  revalidatePath("/", "layout");
  redirect(path);
}

export async function recordExpenseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(expenseSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await recordExpense(user.id, parsed.value);
  if (!result.ok) return errorState(result.error);
  done();
}

export async function recordIncomeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(incomeSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await recordIncome(user.id, parsed.value);
  if (!result.ok) return errorState(result.error);
  done();
}

export async function updateTransactionAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(updateTransactionSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await updateTransaction(user.id, uuid.parse(id), parsed.value);
  if (!result.ok) return errorState(result.error);
  done();
}

export async function deleteTransactionAction(
  id: string,
  _prev: ActionState,
): Promise<ActionState> {
  const user = await requireUser();
  const result = await deleteTransaction(user.id, uuid.parse(id));
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState("Movimiento eliminado.");
}

export async function recordTransferAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(transferSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await recordTransfer(user.id, parsed.value);
  if (!result.ok) return errorState(result.error);
  done();
}

export async function createInstallmentPurchaseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(installmentPurchaseSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await createInstallmentPurchase(user.id, parsed.value);
  if (!result.ok) return errorState(result.error);
  done("/installments");
}

export async function deleteInstallmentPlanAction(
  id: string,
  _prev: ActionState,
): Promise<ActionState> {
  const user = await requireUser();
  const result = await deleteInstallmentPlan(user.id, uuid.parse(id));
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState("Compra en cuotas eliminada.");
}
