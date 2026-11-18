import type { CurrencyCode, LocalDate } from "@/shared/domain";

/**
 * How a notice reached the app. Each movement keeps at most one notice per channel.
 * PUSH is a notification of the bank's app and WALLET an Apple Pay payment, both
 * forwarded by iOS Shortcuts.
 */
export const NOTICE_CHANNELS = ["EMAIL", "SMS", "PUSH", "MANUAL", "WALLET"] as const;
export type NoticeChannel = (typeof NOTICE_CHANNELS)[number];

export const NOTICE_KINDS = [
  "PURCHASE",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "CARD_PAYMENT",
  "WITHDRAWAL",
  "DEPOSIT",
  "UNKNOWN",
] as const;
export type NoticeKind = (typeof NOTICE_KINDS)[number];

export type NoticeInstrument = "CREDIT" | "DEBIT";

export const NOTICE_STATUSES = ["PENDING", "RECORDED", "DISMISSED", "DUPLICATE"] as const;
export type NoticeStatus = (typeof NOTICE_STATUSES)[number];

export type NoticeDirection = "OUT" | "IN";

/** Money leaving (purchases, transfers sent…) or entering (transfers received, deposits). */
export function directionOf(kind: NoticeKind): NoticeDirection | null {
  switch (kind) {
    case "PURCHASE":
    case "TRANSFER_OUT":
    case "CARD_PAYMENT":
    case "WITHDRAWAL":
      return "OUT";
    case "TRANSFER_IN":
    case "DEPOSIT":
      return "IN";
    case "UNKNOWN":
      return null;
  }
}

/** What the parser could read from a notice; anything it could not read is null. */
export type ParsedNotice = Readonly<{
  /** Name from the institutions catalog ("Banco de Chile"), so logos and accounts match. */
  institution: string | null;
  kind: NoticeKind;
  /** Credit or debit, when the text says which card or account was used. */
  instrument: NoticeInstrument | null;
  /** Positive, in minor units of `currency`. */
  amount: number | null;
  currency: CurrencyCode | null;
  /** Merchant of a purchase, or the other person of a transfer. */
  merchant: string | null;
  /** The other bank of a transfer ("a tu cuenta en Santander"). */
  counterpartyInstitution: string | null;
  last4: string | null;
  occurredOn: LocalDate | null;
  /** "HH:MM", 24 h. */
  occurredTime: string | null;
}>;

export type BankNotice = ParsedNotice &
  Readonly<{
    id: string;
    channel: NoticeChannel;
    sender: string | null;
    subject: string | null;
    text: string;
    receivedAt: Date;
    status: NoticeStatus;
    duplicateOfId: string | null;
    transactionId: string | null;
    transferGroupId: string | null;
  }>;

/** The day the movement happened: the one in the text, or the day it arrived. */
export function movementDay(
  notice: Pick<ParsedNotice, "occurredOn"> & { receivedAt: Date },
  timeZone: string,
): LocalDate {
  return notice.occurredOn ?? localDayOf(notice.receivedAt, timeZone);
}

function localDayOf(instant: Date, timeZone: string): LocalDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
  return parts as LocalDate;
}
