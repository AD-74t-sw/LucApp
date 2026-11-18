"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/shared/ui/action-state";
import { errorState, parseForm, successState } from "@/shared/ui/server/form";
import { login, loginSchema, register, registerSchema } from "../application/access";

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(loginSchema, formData);
  if (!parsed.ok) return parsed.error;
  const result = await login(parsed.value);
  if (!result.ok) return errorState(result.error);
  redirect("/dashboard");
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(registerSchema, formData);
  if (!parsed.ok) return parsed.error;
  const result = await register(parsed.value);
  if (!result.ok) return errorState(result.error);
  if (result.value.needsEmailConfirmation) {
    return successState("Te enviamos un correo para confirmar tu cuenta. Ábrelo para continuar.");
  }
  redirect("/dashboard");
}
