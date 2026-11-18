import type { BankNotice as NoticeRow } from "@/generated/prisma/client";
import { toCurrencyCode } from "@/shared/domain";
import {
  type Db,
  prisma,
  toBigInt,
  toDbDateOrNull,
  toLocalDateOrNull,
  toMinorOrNull,
} from "@/shared/infrastructure";
import type { KnownMovement } from "../domain/duplicates";
import type { BankNotice, NoticeChannel, NoticeStatus, ParsedNotice } from "../domain/notice";

/**
 * A notice plus the other channels the same movement arrived through, and the
 * Wallet card it was paid with when any of them was an Apple Pay payment.
 */
export type NoticeWithCopies = BankNotice & {
  copies: readonly NoticeChannel[];
  walletCard: string | null;
};

function toNotice(row: NoticeRow): BankNotice {
  return {
    id: row.id,
    channel: row.channel,
    sender: row.sender,
    subject: row.subject,
    text: row.text,
    receivedAt: row.receivedAt,
    institution: row.institution,
    kind: row.kind,
    instrument: row.instrument,
    amount: toMinorOrNull(row.amount),
    currency: row.currency ? toCurrencyCode(row.currency) : null,
    merchant: row.merchant,
    counterpartyInstitution: row.counterpartyInstitution,
    last4: row.last4,
    occurredOn: toLocalDateOrNull(row.occurredOn),
    occurredTime: row.occurredTime,
    status: row.status,
    duplicateOfId: row.duplicateOfId,
    transactionId: row.transactionId,
    transferGroupId: row.transferGroupId,
  };
}

const withCopies = { duplicates: { select: { channel: true, sender: true } } } as const;
type RowWithCopies = NoticeRow & {
  duplicates: { channel: NoticeChannel; sender: string | null }[];
};

function toNoticeWithCopies(row: RowWithCopies): NoticeWithCopies {
  // An Apple Pay notice keeps the card's name as its sender.
  const wallet = [row, ...row.duplicates].find((n) => n.channel === "WALLET" && n.sender);
  return {
    ...toNotice(row),
    copies: row.duplicates.map((d) => d.channel),
    walletCard: wallet?.sender ?? null,
  };
}

export type NewNotice = ParsedNotice & {
  channel: NoticeChannel;
  sender: string | null;
  subject: string | null;
  text: string;
  textHash: string;
  receivedAt: Date;
  status: "PENDING" | "DUPLICATE";
  duplicateOfId: string | null;
};

export const noticeRepository = {
  async create(userId: string, data: NewNotice): Promise<BankNotice> {
    const row = await prisma.bankNotice.create({
      data: {
        ...data,
        userId,
        amount: data.amount === null ? null : toBigInt(data.amount),
        occurredOn: toDbDateOrNull(data.occurredOn),
      },
    });
    return toNotice(row);
  },

  /** The same text through the same channel shortly before (a retried Shortcut). */
  async findResent(
    userId: string,
    channel: NoticeChannel,
    textHash: string,
    since: Date,
  ): Promise<BankNotice | null> {
    const row = await prisma.bankNotice.findFirst({
      where: { userId, channel, textHash, receivedAt: { gte: since } },
    });
    return row ? toNotice(row) : null;
  },

  /** Recent notices that are not copies, with every channel their movement came through. */
  async listKnownMovements(userId: string, since: Date): Promise<KnownMovement[]> {
    const rows = await prisma.bankNotice.findMany({
      where: { userId, duplicateOfId: null, receivedAt: { gte: since }, amount: { not: null } },
      include: withCopies,
    });
    return rows.map((row) => {
      const notice = toNotice(row);
      return { ...notice, channels: [notice.channel, ...row.duplicates.map((d) => d.channel)] };
    });
  },

  async findById(userId: string, id: string, db: Db = prisma): Promise<NoticeWithCopies | null> {
    const row = await db.bankNotice.findFirst({ where: { id, userId }, include: withCopies });
    return row ? toNoticeWithCopies(row) : null;
  },

  async list(
    userId: string,
    statuses: readonly NoticeStatus[],
    limit: number,
  ): Promise<NoticeWithCopies[]> {
    const rows = await prisma.bankNotice.findMany({
      where: { userId, status: { in: [...statuses] } },
      include: withCopies,
      orderBy: { receivedAt: "desc" },
      take: limit,
    });
    return rows.map(toNoticeWithCopies);
  },

  /** Completes what the kept notice of a movement did not know, from another channel's copy. */
  async fillMissing(
    userId: string,
    id: string,
    data: Pick<ParsedNotice, "institution" | "instrument" | "merchant" | "last4">,
  ): Promise<void> {
    await prisma.bankNotice.updateMany({ where: { userId, id }, data });
  },

  async countPending(userId: string): Promise<number> {
    return prisma.bankNotice.count({ where: { userId, status: "PENDING" } });
  },

  async setStatus(
    userId: string,
    ids: readonly string[],
    data: {
      status: NoticeStatus;
      transactionId?: string | null;
      transferGroupId?: string | null;
      duplicateOfId?: string | null;
    },
    db: Db = prisma,
  ): Promise<number> {
    const result = await db.bankNotice.updateMany({
      where: { userId, id: { in: [...ids] } },
      data,
    });
    return result.count;
  },
};
