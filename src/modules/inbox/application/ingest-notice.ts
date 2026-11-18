import { createHash } from "node:crypto";
import { DEFAULT_TIMEZONE, getProfile } from "@/modules/identity";
import { findDuplicate } from "../domain/duplicates";
import { isMovement } from "../domain/noise";
import type { BankNotice, NoticeChannel, ParsedNotice } from "../domain/notice";
import { isTransferPair } from "../domain/own-transfer";
import { parseNotice } from "../domain/parse-notice";
import { htmlToText, plain } from "../domain/text";
import { parseWalletPayment } from "../domain/wallet";
import { noticeRepository } from "../infrastructure/notice-repository";
import type { IngestInput } from "./inbox-schemas";

/**
 * - CREATED: new, waiting in the inbox.
 * - DUPLICATE: the same movement had already arrived through another channel.
 * - ALREADY_RECORDED: the other leg of a transfer between own accounts already recorded it.
 * - RESENT: this exact text was just received (a retried Shortcut); nothing changed.
 * - IGNORED: not a movement (an offer, a login alert, a payment without amount); not stored.
 */
export type IngestOutcome = "CREATED" | "DUPLICATE" | "ALREADY_RECORDED" | "RESENT" | "IGNORED";

export type IngestResult =
  | { notice: BankNotice; outcome: Exclude<IngestOutcome, "IGNORED"> }
  | { notice: null; outcome: "IGNORED" };

const MAX_TEXT = 10_000;
const MATCH_WINDOW_MS = 72 * 3_600_000;

/**
 * How long the same text through the same channel counts as a retried
 * Shortcut. Emails and SMS carry the time of the movement, so equal texts are
 * the same one; notifications and Apple Pay do not ("Compra por $870 en METRO"
 * twice in a morning are two trips), so only an immediate repeat is a retry.
 */
const RESEND_WINDOW_MS: Record<NoticeChannel, number> = {
  EMAIL: 10 * 60_000,
  SMS: 10 * 60_000,
  MANUAL: 10 * 60_000,
  PUSH: 60_000,
  WALLET: 60_000,
};

/** What a notice says, read from its text or from the fields of an Apple Pay payment. */
function read(
  input: IngestInput,
  year: number,
): { parsed: ParsedNotice; text: string; sender: string | null } | null {
  const text = input.text ? htmlToText(input.text).slice(0, MAX_TEXT) : "";
  if (input.channel === "WALLET") {
    const payment = parseWalletPayment(input);
    if (payment) return { ...payment, sender: input.card ?? input.sender ?? null };
    // A Shortcut that sent the whole transaction as one text.
    if (!text) return null;
    const parsed = parseNotice({ text, sender: input.sender }, year);
    return parsed.amount === null
      ? null
      : { parsed: { ...parsed, kind: "PURCHASE" }, text, sender: input.sender ?? null };
  }
  if (!text) return null;
  const parsed = parseNotice({ text, sender: input.sender, subject: input.subject }, year);
  return { parsed, text, sender: input.sender ?? null };
}

/**
 * Stores a notice sent by a Shortcut (or pasted by hand), merging it with the
 * same movement received through another channel. `keepAll` skips the noise
 * filter: what a person pastes by hand is always kept.
 */
export async function ingestNotice(
  userId: string,
  input: IngestInput,
  options: { keepAll?: boolean } = {},
): Promise<IngestResult> {
  const profile = await getProfile(userId);
  const timeZone = profile?.settings?.timezone ?? DEFAULT_TIMEZONE;
  const receivedAt = input.receivedAt ?? new Date();
  const year = Number(
    new Intl.DateTimeFormat("en", { timeZone, year: "numeric" }).format(receivedAt),
  );

  const notice = read(input, year);
  if (!notice) return { notice: null, outcome: "IGNORED" };
  const { parsed, text } = notice;
  // Bank apps also notify offers, codes and logins: only movements are kept.
  if (input.channel === "PUSH" && !options.keepAll && !isMovement(parsed, text)) {
    return { notice: null, outcome: "IGNORED" };
  }

  const textHash = createHash("sha256").update(plain(text).toLowerCase()).digest("hex");
  const resent = await noticeRepository.findResent(
    userId,
    input.channel,
    textHash,
    new Date(receivedAt.getTime() - RESEND_WINDOW_MS[input.channel]),
  );
  if (resent) return { notice: resent, outcome: "RESENT" };

  const candidate = {
    ...parsed,
    channel: input.channel,
    sender: notice.sender,
    subject: input.channel === "WALLET" ? null : (input.subject ?? null),
    text,
    textHash,
    receivedAt,
  };

  const known = await noticeRepository.listKnownMovements(
    userId,
    new Date(receivedAt.getTime() - MATCH_WINDOW_MS),
  );
  const duplicate = findDuplicate(candidate, known, timeZone);
  if (duplicate) {
    const copy = await noticeRepository.create(userId, {
      ...candidate,
      status: "DUPLICATE",
      duplicateOfId: duplicate.id,
    });
    // Each channel knows something the other does not (Apple Pay the merchant,
    // the bank the card's digits): the notice kept gets what it was missing.
    await noticeRepository.fillMissing(userId, duplicate.id, {
      institution: duplicate.institution ?? candidate.institution,
      instrument: duplicate.instrument ?? candidate.instrument,
      merchant: duplicate.merchant ?? candidate.merchant,
      last4: duplicate.last4 ?? candidate.last4,
    });
    return { notice: copy, outcome: "DUPLICATE" };
  }

  const stored = await noticeRepository.create(userId, {
    ...candidate,
    status: "PENDING",
    duplicateOfId: null,
  });

  // Money arriving at one of my accounts that I already recorded as a transfer
  // from another one: this notice is the transfer's other leg.
  const recordedLeg = known.find(
    (k) =>
      k.status === "RECORDED" &&
      k.transferGroupId !== null &&
      (isTransferPair(k, stored, timeZone) || isTransferPair(stored, k, timeZone)) &&
      !known.some(
        (other) =>
          other.id !== k.id &&
          other.transferGroupId === k.transferGroupId &&
          other.kind === stored.kind,
      ),
  );
  if (recordedLeg) {
    await noticeRepository.setStatus(userId, [stored.id], {
      status: "RECORDED",
      transferGroupId: recordedLeg.transferGroupId,
    });
    return { notice: { ...stored, status: "RECORDED" }, outcome: "ALREADY_RECORDED" };
  }
  return { notice: stored, outcome: "CREATED" };
}
