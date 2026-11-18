import type { EmailOtpType } from "@supabase/supabase-js";
import { z } from "zod";
import { ensureCashAccount } from "@/modules/accounts";
import { createDefaultCategories } from "@/modules/categories";
import { type AuthUser, confirmEmail, ensureProfile, signIn, signUp } from "@/modules/identity";
import { currency, text } from "@/shared/application/fields";
import { type Result, ok } from "@/shared/domain";
import { runInTransaction } from "@/shared/infrastructure";

/**
 * Access = the flows that start a session (register, sign in, confirm email)
 * plus the first-time setup of a new user. It orchestrates the identity and
 * categories modules, which do not know about each other.
 */

/** Creates profile, settings and default categories the first time a user gets a session. */
export async function provisionUser(user: AuthUser): Promise<void> {
  await runInTransaction(async (tx) => {
    const { created, settings } = await ensureProfile(user, tx);
    if (created) await createDefaultCategories(user.id, tx);
    // Every user has a cash account for money in hand (also repaired on later sign-ins).
    await ensureCashAccount(user.id, settings.baseCurrency, tx);
  });
}

export const loginSchema = z.object({
  email: z.email("Correo inválido."),
  password: text(128),
});

export async function login(input: z.infer<typeof loginSchema>): Promise<Result<void>> {
  const result = await signIn(input);
  if (!result.ok) return result;
  await provisionUser(result.value);
  return ok();
}

export const registerSchema = z.object({
  name: text(80),
  email: z.email("Correo inválido."),
  password: z.string().min(8, "Mínimo 8 caracteres.").max(128),
  baseCurrency: currency(),
  timezone: text(64),
});

export async function register(
  input: z.infer<typeof registerSchema>,
): Promise<Result<{ needsEmailConfirmation: boolean }>> {
  const result = await signUp({
    name: input.name,
    email: input.email,
    password: input.password,
    metadata: { baseCurrency: input.baseCurrency, timezone: input.timezone },
  });
  if (!result.ok) return result;
  if (!result.value.session) return ok({ needsEmailConfirmation: true });
  await provisionUser(result.value.user);
  return ok({ needsEmailConfirmation: false });
}

export async function completeEmailConfirmation(
  params: { code: string } | { tokenHash: string; type: EmailOtpType },
): Promise<Result<void>> {
  const result = await confirmEmail(params);
  if (!result.ok) return result;
  await provisionUser(result.value);
  return ok();
}
