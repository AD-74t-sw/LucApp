"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/shared/ui/action-state";
import { errorState, parseForm, successState } from "@/shared/ui/server/form";
import { signOut } from "../application/authentication";
import { saveSettings, settingsSchema } from "../application/profile";
import { requireUser } from "./session";

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/login");
}

export async function saveSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(settingsSchema, formData);
  if (!parsed.ok) return parsed.error;
  const user = await requireUser();
  const result = await saveSettings(user.id, parsed.value);
  if (!result.ok) return errorState(result.error);
  revalidatePath("/", "layout");
  return successState("Preferencias guardadas.");
}
