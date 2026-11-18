import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "@/shared/infrastructure";

const digest = (value: string) => createHash("sha256").update(value).digest();

/**
 * True when a request to run jobs carries `Authorization: Bearer <CRON_SECRET>`.
 * Without CRON_SECRET the endpoint is off (the in-process scheduler runs instead).
 */
export function isJobRequestAuthorized(authorization: string | null): boolean {
  const secret = env().CRON_SECRET;
  if (!secret || !authorization?.startsWith("Bearer ")) return false;
  return timingSafeEqual(digest(authorization.slice("Bearer ".length)), digest(secret));
}
