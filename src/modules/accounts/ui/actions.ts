"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/modules/identity";
import type { ActionState } from "@/shared/ui/action-state";
import { errorState, parseForm, successState } from "@/shared/ui/server/form";
import {
  createAccountSchema,
  createCardSchema,
  updateAccountSchema,
  updateCardSchema,
} from "../application/account-schemas";
import {
  createAccount,
  deleteAccount,
  setAccountArchived,
  updateAccount,
} from "../application/manage-accounts";
import { createCard, deleteCard, setCardArchived, updateCard } from "../application/manage-cards";

const uuid = z.uuid();

export async function createAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(createAccountSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await createAccount(user.id, parsed.value);
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  redirect(`/accounts/${result.value.id}`);
}

export async function updateAccountAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(updateAccountSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await updateAccount(user.id, uuid.parse(id), parsed.value);
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  redirect(`/accounts/${id}`);
}

export async function toggleAccountArchivedAction(
  id: string,
  archived: boolean,
  _prev: ActionState,
): Promise<ActionState> {
  const user = await requireUser();
  const result = await setAccountArchived(user.id, uuid.parse(id), archived);
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState(archived ? "Cuenta archivada." : "Cuenta restaurada.");
}

export async function deleteAccountAction(id: string, _prev: ActionState): Promise<ActionState> {
  const user = await requireUser();
  const result = await deleteAccount(user.id, uuid.parse(id));
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  redirect("/accounts");
}

export async function createCardAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(createCardSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await createCard(user.id, parsed.value);
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState("Tarjeta agregada.");
}

export async function updateCardAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(updateCardSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await updateCard(user.id, uuid.parse(id), parsed.value);
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState("Tarjeta actualizada.");
}

export async function toggleCardArchivedAction(
  id: string,
  archived: boolean,
  _prev: ActionState,
): Promise<ActionState> {
  const user = await requireUser();
  const result = await setCardArchived(user.id, uuid.parse(id), archived);
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState(archived ? "Tarjeta archivada." : "Tarjeta restaurada.");
}

export async function deleteCardAction(id: string, _prev: ActionState): Promise<ActionState> {
  const user = await requireUser();
  const result = await deleteCard(user.id, uuid.parse(id));
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState("Tarjeta eliminada.");
}
