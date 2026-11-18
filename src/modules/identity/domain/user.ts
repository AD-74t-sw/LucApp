import { type CurrencyCode, DEFAULT_CURRENCY, isCurrencyCode } from "@/shared/domain";

export type UserSettings = Readonly<{
  baseCurrency: CurrencyCode;
  timezone: string;
}>;

/** The authenticated user as seen by every other module. */
export type CurrentUser = Readonly<{
  id: string;
  name: string;
  email: string;
}> &
  UserSettings;

/** Identity as reported by Supabase Auth, before the app profile exists. */
export type AuthUser = Readonly<{
  id: string;
  email: string;
  /** Data stored at sign-up time in Supabase `user_metadata`. */
  metadata: Readonly<Record<string, unknown>>;
}>;

export const DEFAULT_TIMEZONE = "America/Santiago";

export const DEFAULT_SETTINGS: UserSettings = {
  baseCurrency: DEFAULT_CURRENCY,
  timezone: DEFAULT_TIMEZONE,
};

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Initial profile and settings derived from what the person chose when registering. */
export function initialProfile(user: AuthUser): { name: string; settings: UserSettings } {
  const { name, baseCurrency, timezone } = user.metadata;
  return {
    name: typeof name === "string" && name.trim() ? name.trim() : user.email.split("@")[0]!,
    settings: {
      baseCurrency:
        typeof baseCurrency === "string" && isCurrencyCode(baseCurrency)
          ? baseCurrency
          : DEFAULT_SETTINGS.baseCurrency,
      timezone:
        typeof timezone === "string" && isValidTimeZone(timezone)
          ? timezone
          : DEFAULT_SETTINGS.timezone,
    },
  };
}
