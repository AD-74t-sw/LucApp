"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/modules/identity";
import type { ActionState } from "@/shared/ui/action-state";
import { errorState, parseForm, successState } from "@/shared/ui/server/form";
import {
  debtSchema,
  paymentSchema,
  personSchema,
  updateDebtSchema,
  updatePaymentSchema,
} from "../application/debt-schemas";
import {
  createDebt,
  createPerson,
  deleteDebt,
  deletePayment,
  deletePerson,
  recordPayment,
  updateDebt,
  updatePayment,
  updatePerson,
} from "../application/manage-debts";

const uuid = z.uuid();

export async function createPersonAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(personSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await createPerson(user.id, parsed.value);
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState("Persona agregada.");
}

export async function updatePersonAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(personSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await updatePerson(user.id, uuid.parse(id), parsed.value);
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState("Datos actualizados.");
}

export async function deletePersonAction(id: string, _prev: ActionState): Promise<ActionState> {
  const user = await requireUser();
  const result = await deletePerson(user.id, uuid.parse(id));
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  redirect("/debts");
}

export async function createDebtAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(debtSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await createDebt(user.id, parsed.value);
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState("Deuda registrada.");
}

export async function recordPaymentAction(
  debtId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(paymentSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await recordPayment(user.id, uuid.parse(debtId), parsed.value);
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState(
    result.value.settled ? "Abono registrado. ¡Deuda saldada!" : "Abono registrado.",
  );
}

export async function deletePaymentAction(
  paymentId: string,
  _prev: ActionState,
): Promise<ActionState> {
  const user = await requireUser();
  const result = await deletePayment(user.id, uuid.parse(paymentId));
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState("Abono eliminado.");
}

export async function deleteDebtAction(debtId: string, _prev: ActionState): Promise<ActionState> {
  const user = await requireUser();
  const result = await deleteDebt(user.id, uuid.parse(debtId));
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState("Deuda eliminada.");
}

export async function updateDebtAction(
  debtId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(updateDebtSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await updateDebt(user.id, uuid.parse(debtId), parsed.value);
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  redirect(`/debts/${parsed.value.personId}`);
}

export async function updatePaymentAction(
  paymentId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(updatePaymentSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await updatePayment(user.id, uuid.parse(paymentId), parsed.value);
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState(
    result.value.settled ? "Abono actualizado. ¡Deuda saldada!" : "Abono actualizado.",
  );
}
