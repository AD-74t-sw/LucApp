import type { EmailOtpType, User } from "@supabase/supabase-js";
import { type Result, conflict, ok, validationError } from "@/shared/domain";
import { env } from "@/shared/infrastructure";
import type { AuthUser } from "../domain/user";
import { createSupabaseServerClient } from "../infrastructure/supabase";

function toAuthUser(user: Pick<User, "id" | "email" | "user_metadata">): AuthUser {
  return { id: user.id, email: user.email ?? "", metadata: user.user_metadata ?? {} };
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<Result<AuthUser>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(input);
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") {
      return validationError(
        "Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.",
      );
    }
    return validationError("Correo o contraseña incorrectos.");
  }
  return ok(toAuthUser(data.user));
}

export type SignUpInput = {
  name: string;
  email: string;
  password: string;
  /** Saved in Supabase user metadata and used to create the app profile. */
  metadata: Record<string, string>;
};

/**
 * Registers the person in Supabase Auth. When the project requires email
 * confirmation there is no session yet (`session: false`).
 */
export async function signUp(
  input: SignUpInput,
): Promise<Result<{ user: AuthUser; session: boolean }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { name: input.name, ...input.metadata },
      emailRedirectTo: `${env().APP_URL}/auth/callback`,
    },
  });
  if (error || !data.user) {
    if (error?.code === "user_already_exists") {
      return conflict("Ya existe una cuenta con ese correo.", "email");
    }
    if (error?.code === "weak_password") {
      return validationError("La contraseña es muy débil.", "password");
    }
    return validationError(error?.message ?? "No pudimos crear la cuenta.");
  }
  return ok({ user: toAuthUser(data.user), session: data.session !== null });
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

/** Completes the email confirmation link (PKCE `code` or `token_hash`). */
export async function confirmEmail(
  params: { code: string } | { tokenHash: string; type: EmailOtpType },
): Promise<Result<AuthUser>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } =
    "code" in params
      ? await supabase.auth.exchangeCodeForSession(params.code)
      : await supabase.auth.verifyOtp({ token_hash: params.tokenHash, type: params.type });
  if (error || !data.user) {
    return validationError("El enlace de confirmación no es válido o expiró.");
  }
  return ok(toAuthUser(data.user));
}

/**
 * Authenticated user for this request, verified from the JWT (getClaims checks
 * the signature), or null when signed out.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) return null;
  const { sub, email, user_metadata } = data.claims;
  return {
    id: sub,
    email: typeof email === "string" ? email : "",
    metadata: (user_metadata as Record<string, unknown> | undefined) ?? {},
  };
}
