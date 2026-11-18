import type { Reimbursement as ReimbursementRow } from "@/generated/prisma/client";
import { type CurrencyCode, type LocalDate, toCurrencyCode } from "@/shared/domain";
import {
  type Db,
  prisma,
  toBigInt,
  toDbDate,
  toDbDateOrNull,
  toLocalDate,
  toLocalDateOrNull,
  toMinorOrNull,
} from "@/shared/infrastructure";
import type {
  Reimbursement,
  ReimbursementKind,
  ReimbursementStatus,
} from "../domain/reimbursement";

const toBigIntOrNull = (value: number | null) => (value === null ? null : toBigInt(value));

function toReimbursement(row: ReimbursementRow): Reimbursement {
  return {
    id: row.id,
    kind: row.kind,
    provider: row.provider,
    description: row.description,
    currency: toCurrencyCode(row.currency),
    requestedOn: toLocalDate(row.requestedOn),
    estimatedAmount: toMinorOrNull(row.estimatedAmount),
    status: row.status,
    amount: toMinorOrNull(row.amount),
    expectedFrom: toLocalDateOrNull(row.expectedFrom),
    expectedTo: toLocalDateOrNull(row.expectedTo),
    receivedOn: toLocalDateOrNull(row.receivedOn),
    receivedAmount: toMinorOrNull(row.receivedAmount),
    note: row.note,
    transactionId: row.transactionId,
  };
}

/** What the user describes about the claim (editable in any state). */
export type ClaimDetails = {
  kind: ReimbursementKind;
  provider: string;
  description: string;
  requestedOn: LocalDate;
  estimatedAmount: number | null;
  note: string | null;
};

export type ReimbursementProgress = {
  status: ReimbursementStatus;
  amount?: number | null;
  expectedFrom?: LocalDate | null;
  expectedTo?: LocalDate | null;
  receivedOn?: LocalDate | null;
  receivedAmount?: number | null;
  transactionId?: string | null;
};

export const reimbursementRepository = {
  async list(userId: string): Promise<Reimbursement[]> {
    const rows = await prisma.reimbursement.findMany({
      where: { userId },
      orderBy: { requestedOn: "desc" },
    });
    return rows.map(toReimbursement);
  },

  async listOpen(userId: string): Promise<Reimbursement[]> {
    const rows = await prisma.reimbursement.findMany({
      where: { userId, status: { in: ["IN_REVIEW", "APPROVED"] } },
    });
    return rows.map(toReimbursement);
  },

  async findById(userId: string, id: string, db: Db = prisma): Promise<Reimbursement | null> {
    const row = await db.reimbursement.findFirst({ where: { id, userId } });
    return row ? toReimbursement(row) : null;
  },

  async create(userId: string, data: ClaimDetails & { currency: CurrencyCode }): Promise<string> {
    const row = await prisma.reimbursement.create({
      data: {
        userId,
        ...data,
        requestedOn: toDbDate(data.requestedOn),
        estimatedAmount: toBigIntOrNull(data.estimatedAmount),
      },
      select: { id: true },
    });
    return row.id;
  },

  async updateDetails(userId: string, id: string, data: ClaimDetails): Promise<void> {
    await prisma.reimbursement.updateMany({
      where: { id, userId },
      data: {
        ...data,
        requestedOn: toDbDate(data.requestedOn),
        estimatedAmount: toBigIntOrNull(data.estimatedAmount),
      },
    });
  },

  /** Moves the claim along its life cycle; fields left undefined keep their value. */
  async setProgress(
    userId: string,
    id: string,
    data: ReimbursementProgress,
    db: Db = prisma,
  ): Promise<void> {
    await db.reimbursement.updateMany({
      where: { id, userId },
      data: {
        status: data.status,
        amount: data.amount === undefined ? undefined : toBigIntOrNull(data.amount),
        expectedFrom:
          data.expectedFrom === undefined ? undefined : toDbDateOrNull(data.expectedFrom),
        expectedTo: data.expectedTo === undefined ? undefined : toDbDateOrNull(data.expectedTo),
        receivedOn: data.receivedOn === undefined ? undefined : toDbDateOrNull(data.receivedOn),
        receivedAmount:
          data.receivedAmount === undefined ? undefined : toBigIntOrNull(data.receivedAmount),
        transactionId: data.transactionId,
      },
    });
  },

  async delete(userId: string, id: string, db: Db = prisma): Promise<void> {
    await db.reimbursement.deleteMany({ where: { id, userId } });
  },
};
