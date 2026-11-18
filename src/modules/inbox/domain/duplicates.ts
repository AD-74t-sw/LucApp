import { type LocalDate, addDays } from "@/shared/domain";
import { type BankNotice, type NoticeChannel, movementDay } from "./notice";
import { merchantKey, minutesOf } from "./text";

type Comparable = Pick<
  BankNotice,
  | "channel"
  | "institution"
  | "kind"
  | "amount"
  | "currency"
  | "merchant"
  | "last4"
  | "occurredOn"
  | "occurredTime"
  | "receivedAt"
>;

/** A stored notice and every channel its movement already arrived through. */
export type KnownMovement = Comparable &
  Pick<BankNotice, "status" | "transferGroupId" | "instrument"> & {
    id: string;
    channels: readonly NoticeChannel[];
  };

const MAX_HOURS_APART = 72;
const MAX_MINUTES_APART = 20;

/**
 * The same movement told twice, typically by email and by SMS.
 *
 * Banks do not send the same movement twice through one channel, so only
 * notices from different channels can be the same movement: two identical
 * coffees bought the same day, both by SMS, stay as two. Beyond that the
 * amount, currency and kind must match, the day can differ by one (a late
 * email), and bank, card, merchant and time must not contradict each other.
 */
export function sameMovement(a: Comparable, b: Comparable, timeZone: string): boolean {
  if (a.channel === b.channel) return false;
  if (a.amount === null || a.amount !== b.amount || a.currency !== b.currency) return false;
  if (a.kind !== b.kind && a.kind !== "UNKNOWN" && b.kind !== "UNKNOWN") return false;
  if (!compatible(a.institution, b.institution)) return false;
  if (!compatible(a.last4, b.last4)) return false;
  if (!similarMerchants(a.merchant, b.merchant)) return false;
  const hoursApart = Math.abs(a.receivedAt.getTime() - b.receivedAt.getTime()) / 3_600_000;
  if (hoursApart > MAX_HOURS_APART) return false;

  const dayA = movementDay(a, timeZone);
  const dayB = movementDay(b, timeZone);
  if (!withinOneDay(dayA, dayB)) return false;
  if (dayA === dayB && a.occurredTime && b.occurredTime) {
    return Math.abs(minutesOf(a.occurredTime) - minutesOf(b.occurredTime)) <= MAX_MINUTES_APART;
  }
  return true;
}

/** The known movement this notice repeats, if any (the closest in time when several match). */
export function findDuplicate(
  notice: Comparable,
  known: readonly KnownMovement[],
  timeZone: string,
): KnownMovement | null {
  const matches = known.filter(
    (k) => !k.channels.includes(notice.channel) && sameMovement(notice, k, timeZone),
  );
  const distance = (k: KnownMovement) =>
    Math.abs(k.receivedAt.getTime() - notice.receivedAt.getTime());
  return matches.sort((a, b) => distance(a) - distance(b))[0] ?? null;
}

function compatible(a: string | null, b: string | null): boolean {
  return a === null || b === null || a === b;
}

/** Same merchant written differently: "LIDER EXPRESS 123" and "Lider Express". */
export function similarMerchants(a: string | null, b: string | null): boolean {
  const ka = merchantKey(a);
  const kb = merchantKey(b);
  if (ka === null || kb === null) return true;
  return ka.includes(kb) || kb.includes(ka) || ka.slice(0, 6) === kb.slice(0, 6);
}

function withinOneDay(a: LocalDate, b: LocalDate): boolean {
  return a === b || addDays(a, 1) === b || addDays(b, 1) === a;
}
