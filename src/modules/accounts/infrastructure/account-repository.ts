import type { FinancialAccount } from "@/generated/prisma/client";
import { toCurrencyCode, type CurrencyCode } from "@/shared/domain";
import {
  type Db,
  isForeignKeyViolation,
  isUniqueViolation,
  prisma,
  toBigInt,
  toMinor,
  toMinorOrNull,
} from "@/shared/infrastructure";
import type { Account, AccountType } from "../domain/account";

function toDomain(row: FinancialAccount): Account {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    institution: row.institution,
    currency: toCurrencyCode(row.currency),
    openingBalance: toMinor(row.openingBalance),
    creditLimit: toMinorOrNull(row.creditLimit),
    secondaryCurrency: row.secondaryCurrency ? toCurrencyCode(row.secondaryCurrency) : null,
    secondaryCreditLimit: toMinorOrNull(row.secondaryCreditLimit),
    secondaryOpeningBalance: toMinor(row.secondaryOpeningBalance),
    closingDay: row.closingDay,
    dueDay: row.dueDay,
    archived: row.archivedAt !== null,
  };
}

export type AccountData = {
  name: string;
  institution: string | null;
  openingBalance: number;
  creditLimit: number | null;
  secondaryCurrency: CurrencyCode | null;
  secondaryCreditLimit: number | null;
  secondaryOpeningBalance: number;
  closingDay: number | null;
  dueDay: number | null;
};

function toRow(data: AccountData) {
  return {
    ...data,
    openingBalance: toBigInt(data.openingBalance),
    creditLimit: data.creditLimit === null ? null : toBigInt(data.creditLimit),
    secondaryCreditLimit:
      data.secondaryCreditLimit === null ? null : toBigInt(data.secondaryCreditLimit),
    secondaryOpeningBalance: toBigInt(data.secondaryOpeningBalance),
  };
}

export const accountRepository = {
  async list(userId: string, options: { includeArchived?: boolean } = {}): Promise<Account[]> {
    const rows = await prisma.financialAccount.findMany({
      where: { userId, ...(options.includeArchived ? {} : { archivedAt: null }) },
      orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { type: "asc" }, { name: "asc" }],
    });
    return rows.map(toDomain);
  },

  async findById(userId: string, id: string, db: Db = prisma): Promise<Account | null> {
    const row = await db.financialAccount.findFirst({ where: { id, userId } });
    return row ? toDomain(row) : null;
  },

  /** Returns null when the name is already used by another account of the user. */
  /** Active (not archived) accounts of a type, optionally excluding one. */
  async countActive(
    userId: string,
    type: AccountType,
    options: { excludeId?: string } = {},
    db: Db = prisma,
  ): Promise<number> {
    return db.financialAccount.count({
      where: {
        userId,
        type,
        archivedAt: null,
        ...(options.excludeId ? { id: { not: options.excludeId } } : {}),
      },
    });
  },

  async nameExists(userId: string, name: string, db: Db = prisma): Promise<boolean> {
    return (await db.financialAccount.count({ where: { userId, name } })) > 0;
  },

  async create(
    userId: string,
    type: AccountType,
    currency: CurrencyCode,
    data: AccountData,
    db: Db = prisma,
  ): Promise<Account | null> {
    try {
      const row = await db.financialAccount.create({
        data: { userId, type, currency, ...toRow(data) },
      });
      return toDomain(row);
    } catch (error) {
      if (isUniqueViolation(error)) return null;
      throw error;
    }
  },

  /** Returns null when the new name collides with another account. */
  async update(userId: string, id: string, data: AccountData): Promise<Account | null> {
    try {
      await prisma.financialAccount.updateMany({ where: { id, userId }, data: toRow(data) });
    } catch (error) {
      if (isUniqueViolation(error)) return null;
      throw error;
    }
    return toDomain(await prisma.financialAccount.findFirstOrThrow({ where: { id, userId } }));
  },

  async setArchived(userId: string, id: string, archived: boolean): Promise<void> {
    await prisma.financialAccount.updateMany({
      where: { id, userId },
      data: { archivedAt: archived ? new Date() : null },
    });
  },

  /** Accounts with movements cannot be deleted (ON DELETE RESTRICT); archive them instead. */
  async delete(userId: string, id: string): Promise<"deleted" | "in_use"> {
    try {
      await prisma.financialAccount.deleteMany({ where: { id, userId } });
      return "deleted";
    } catch (error) {
      if (isForeignKeyViolation(error)) return "in_use";
      throw error;
    }
  },
};
