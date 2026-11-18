import { addDays } from "@/shared/domain";
import { type BankNotice, movementDay } from "./notice";
import { plain } from "./text";

/**
 * Whether a transfer's counterparty is the person themself: every word of a
 * one-word name, or the first name plus at least one more of theirs
 * ("Lucía Pérez" matches "LUCIA ANDREA PEREZ SOTO").
 */
export function isOwnName(counterparty: string | null, ownName: string): boolean {
  if (!counterparty) return false;
  const words = (value: string) =>
    plain(value)
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length > 1);
  const mine = words(ownName);
  const theirs = new Set(words(counterparty));
  if (mine.length === 0 || theirs.size === 0) return false;
  if (mine.length === 1) return theirs.has(mine[0]!) && theirs.size === 1;
  return theirs.has(mine[0]!) && mine.slice(1).some((w) => theirs.has(w));
}

type Leg = Pick<BankNotice, "kind" | "amount" | "currency" | "occurredOn" | "receivedAt">;

/**
 * A transfer sent from one of the person's banks and the same money arriving
 * at another (or another account of the same bank): same amount and currency,
 * at most a day apart. It is only a suggestion; the person confirms it.
 */
export function isTransferPair(sent: Leg, received: Leg, timeZone: string): boolean {
  if (sent.kind !== "TRANSFER_OUT") return false;
  if (received.kind !== "TRANSFER_IN" && received.kind !== "DEPOSIT") return false;
  if (sent.amount === null || sent.amount !== received.amount) return false;
  if (sent.currency !== received.currency) return false;
  const a = movementDay(sent, timeZone);
  const b = movementDay(received, timeZone);
  return a === b || addDays(a, 1) === b || addDays(b, 1) === a;
}
