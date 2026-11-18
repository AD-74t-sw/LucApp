import { z } from "zod";
import { currency, text } from "@/shared/application/fields";
import { type Result, ok, validationError } from "@/shared/domain";
import type { Db } from "@/shared/infrastructure";
import { type AuthUser, type UserSettings, initialProfile, isValidTimeZone } from "../domain/user";
import { type UserProfile, userRepository } from "../infrastructure/user-repository";

export function getProfile(userId: string): Promise<UserProfile | null> {
  return userRepository.findProfile(userId);
}

/**
 * Creates the app profile for a Supabase user the first time they get a session.
 * Idempotent: returns `created: false` when the profile already exists.
 */
export async function ensureProfile(
  user: AuthUser,
  db?: Db,
): Promise<{ created: boolean; settings: UserSettings }> {
  const { name, settings } = initialProfile(user);
  const created = await userRepository.createProfile(
    { id: user.id, email: user.email, name, settings },
    db,
  );
  if (created) return { created, settings };
  const existing = await userRepository.findProfile(user.id);
  return { created, settings: existing?.settings ?? settings };
}

export const settingsSchema = z.object({
  name: text(80),
  baseCurrency: currency(),
  timezone: text(64),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export async function saveSettings(
  userId: string,
  input: SettingsInput,
): Promise<Result<UserSettings>> {
  if (!isValidTimeZone(input.timezone)) {
    return validationError("Zona horaria desconocida.", "timezone");
  }
  await userRepository.updateName(userId, input.name);
  return ok(
    await userRepository.saveSettings(userId, {
      baseCurrency: input.baseCurrency,
      timezone: input.timezone,
    }),
  );
}
