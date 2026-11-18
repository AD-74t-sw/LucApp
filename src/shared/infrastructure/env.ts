import { z } from "zod";

/** Empty variables (KEY= in a .env file) count as not set. */
const optional = <T extends z.ZodType>(type: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), type.optional());

/** Server environment, validated once on first access. */
const schema = z.object({
  DATABASE_URL: z.url(),
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  APP_URL: z.url(),
  /** Web Push keys (`make vapid`). Without them notifications are off. */
  VAPID_PUBLIC_KEY: optional(z.string().min(20)),
  VAPID_PRIVATE_KEY: optional(z.string().min(20)),
  /** Contact the push services can reach ("mailto:you@example.com" or an https URL). */
  VAPID_SUBJECT: optional(z.string().regex(/^(mailto:|https:)/, "mailto: or https: URL")),
  /** Lets an external cron call POST /api/jobs/tick (for hosts that sleep). */
  CRON_SECRET: optional(z.string().min(16)),
  /** "off" disables the in-process scheduler (see src/instrumentation.ts). */
  SCHEDULER: optional(z.enum(["on", "off"])),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  if (process.env["SKIP_ENV_VALIDATION"]) {
    // Used during `next build` inside Docker, where runtime secrets are not available.
    return process.env as unknown as Env;
  }
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  }
  cached = parsed.data;
  return cached;
}
