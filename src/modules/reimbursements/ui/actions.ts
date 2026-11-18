"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/modules/identity";
import type { ActionState } from "@/shared/ui/action-state";
import { errorState, parseForm, successState } from "@/shared/ui/server/form";
import {
  approveReimbursement,
  createReimbursement,
  deleteReimbursement,
  markReceived,
  rejectReimbursement,
  reopenReimbursement,
  updateReimbursement,
} from "../application/manage-reimbursements";
import {
  approvalSchema,
  claimSchema,
  newClaimSchema,
  receiptSchema,
} from "../application/reimbursement-schemas";

const uuid = z.uuid();

export async function createReimbursementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(newClaimSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await createReimbursement(user.id, parsed.value);
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState("Devolución agregada.");
}

export async function updateReimbursementAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(claimSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await updateReimbursement(user.id, uuid.parse(id), parsed.value);
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState("Cambios guardados.");
}

export async function approveReimbursementAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(approvalSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await approveReimbursement(user.id, uuid.parse(id), parsed.value);
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState("Monto y fechas guardados.");
}

export async function markReceivedAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(receiptSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await markReceived(user.id, uuid.parse(id), parsed.value);
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState("Devolución recibida.");
}

export async function rejectReimbursementAction(
  id: string,
  _prev: ActionState,
): Promise<ActionState> {
  const user = await requireUser();
  const result = await rejectReimbursement(user.id, uuid.parse(id));
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState("Marcada como rechazada.");
}

export async function reopenReimbursementAction(
  id: string,
  _prev: ActionState,
): Promise<ActionState> {
  const user = await requireUser();
  const result = await reopenReimbursement(user.id, uuid.parse(id));
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState("Devolución reabierta.");
}

export async function deleteReimbursementAction(
  id: string,
  _prev: ActionState,
): Promise<ActionState> {
  const user = await requireUser();
  const result = await deleteReimbursement(user.id, uuid.parse(id));
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState("Devolución eliminada.");
}
