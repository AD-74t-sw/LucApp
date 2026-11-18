import type { Prisma, Transaction as TransactionRow } from "@/generated/prisma/client";
import type { CardNetwork } from "@/modules/accounts";
import type { CostType, Necessity } from "@/modules/categories";
import { type CurrencyCode, type LocalDate, toCurrencyCode } from "@/shared/domain";
import { type Db, prisma, toBigInt, toDbDate, toLocalDate, toMinor } from "@/shared/infrastructure";
import type { BalanceAmounts } from "../domain/balance";
import type { Transaction, TransactionKind } from "../domain/transaction";

function toDomain(row: TransactionRow): Transaction {
  return {
    id: row.id,
    accountId: row.accountId,
    cardId: row.cardId,
    kind: row.kind,
    amount: toMinor(row.amount),
    currency: toCurrencyCode(row.currency),
    date: toLocalDate(row.date),
    description: row.description,
    note: row.note,
    categoryId: row.categoryId,
    costType: row.costType,
    necessity: row.necessity,
    transferGroupId: row.transferGroupId,
    installmentPlanId: row.installmentPlanId,
    installmentNumber: row.installmentNumber,
  };
}

export type NewTransaction = {
  accountId: string;
  cardId: string | null;
  kind: TransactionKind;
  amount: number;
  currency: CurrencyCode;
  date: LocalDate;
  description: string;
  note?: string | null;
  categoryId?: string | null;
  costType?: CostType | null;
  necessity?: Necessity | null;
  transferGroupId?: string | null;
  installmentPlanId?: string | null;
  installmentNumber?: number | null;
};

function toRow(userId: string, data: NewTransaction): Prisma.TransactionUncheckedCreateInput {
  return {
    userId,
    accountId: data.accountId,
    cardId: data.cardId,
    kind: data.kind,
    amount: toBigInt(data.amount),
    currency: data.currency,
    date: toDbDate(data.date),
    description: data.description,
    note: data.note ?? null,
    categoryId: data.categoryId ?? null,
    costType: data.costType ?? null,
    necessity: data.necessity ?? null,
    transferGroupId: data.transferGroupId ?? null,
    installmentPlanId: data.installmentPlanId ?? null,
    installmentNumber: data.installmentNumber ?? null,
  };
}

export type TransactionFilters = {
  from?: LocalDate | undefined;
  to?: LocalDate | undefined;
  accountId?: string | undefined;
  cardId?: string | undefined;
  /** Matches the category and its subcategories. */
  categoryIds?: readonly string[] | undefined;
  kind?: TransactionKind | undefined;
  costType?: CostType | undefined;
  necessity?: Necessity | undefined;
  search?: string | undefined;
};

/** Row for the movements list, with the names it needs to render. */
export type TransactionListItem = Transaction & {
  accountName: string;
  cardName: string | null;
  cardNetwork: CardNetwork | null;
  categoryName: string | null;
  categoryColor: string | null;
  parentCategoryName: string | null;
};

function whereFor(userId: string, filters: TransactionFilters): Prisma.TransactionWhereInput {
  return {
    userId,
    ...(filters.accountId ? { accountId: filters.accountId } : {}),
    ...(filters.cardId ? { cardId: filters.cardId } : {}),
    ...(filters.categoryIds ? { categoryId: { in: [...filters.categoryIds] } } : {}),
    ...(filters.kind ? { kind: filters.kind } : {}),
    ...(filters.costType ? { costType: filters.costType } : {}),
    ...(filters.necessity ? { necessity: filters.necessity } : {}),
    ...(filters.search
      ? { description: { contains: filters.search, mode: "insensitive" as const } }
      : {}),
    ...(filters.from || filters.to
      ? {
          date: {
            ...(filters.from ? { gte: toDbDate(filters.from) } : {}),
            ...(filters.to ? { lte: toDbDate(filters.to) } : {}),
          },
        }
      : {}),
  };
}

export const transactionRepository = {
  async create(userId: string, data: NewTransaction, db: Db = prisma): Promise<Transaction> {
    return toDomain(await db.transaction.create({ data: toRow(userId, data) }));
  },

  async createMany(
    userId: string,
    rows: readonly NewTransaction[],
    db: Db = prisma,
  ): Promise<void> {
    await db.transaction.createMany({ data: rows.map((row) => toRow(userId, row)) });
  },

  /** Movements of exactly this size (either sign) between two dates, newest first. */
  async findByAmount(
    userId: string,
    amount: number,
    currency: CurrencyCode,
    from: LocalDate,
    to: LocalDate,
  ): Promise<Transaction[]> {
    const rows = await prisma.transaction.findMany({
      where: {
        userId,
        currency,
        amount: { in: [toBigInt(amount), toBigInt(-amount)] },
        date: { gte: toDbDate(from), lte: toDbDate(to) },
      },
      orderBy: { date: "desc" },
      take: 5,
    });
    return rows.map(toDomain);
  },

  async findById(userId: string, id: string, db: Db = prisma): Promise<Transaction | null> {
    const row = await db.transaction.findFirst({ where: { id, userId } });
    return row ? toDomain(row) : null;
  },

  async update(userId: string, id: string, data: NewTransaction): Promise<void> {
    const { userId: _ignored, ...row } = toRow(userId, data);
    await prisma.transaction.updateMany({ where: { id, userId }, data: row });
  },

  /** Adjusts a DEBT movement; only DEBT rows are touched so other kinds stay protected. */
  async updateDebtMovement(
    userId: string,
    id: string,
    data: { amount: number; date: LocalDate; description: string },
    db: Db = prisma,
  ): Promise<void> {
    await db.transaction.updateMany({
      where: { id, userId, kind: "DEBT" },
      data: {
        amount: toBigInt(data.amount),
        date: toDbDate(data.date),
        description: data.description,
      },
    });
  },

  async delete(userId: string, id: string, db: Db = prisma): Promise<void> {
    await db.transaction.deleteMany({ where: { id, userId } });
  },

  async deleteTransferGroup(userId: string, transferGroupId: string): Promise<void> {
    await prisma.transaction.deleteMany({ where: { userId, transferGroupId } });
  },

  async list(
    userId: string,
    filters: TransactionFilters,
    page: number,
    pageSize: number,
  ): Promise<{ items: TransactionListItem[]; total: number }> {
    const where = whereFor(userId, filters);
    const [rows, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          account: { select: { name: true } },
          card: { select: { name: true, network: true } },
          category: { select: { name: true, color: true, parent: { select: { name: true } } } },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transaction.count({ where }),
    ]);
    return {
      total,
      items: rows.map((row) => ({
        ...toDomain(row),
        accountName: row.account.name,
        cardName: row.card?.name ?? null,
        cardNetwork: row.card?.network ?? null,
        categoryName: row.category?.name ?? null,
        categoryColor: row.category?.color ?? null,
        parentCategoryName: row.category?.parent?.name ?? null,
      })),
    };
  },

  /** Sum of movements per account, split at `today` (aggregated in SQL). */
  /** Sum of movements per account and currency, split at `today` (aggregated in SQL). */
  async balances(
    userId: string,
    today: LocalDate,
  ): Promise<Map<string, Map<CurrencyCode, BalanceAmounts>>> {
    const rows = await prisma.$queryRaw<
      { accountId: string; currency: string; posted: bigint; scheduled: bigint }[]
    >`
      SELECT "accountId", currency,
             COALESCE(SUM(amount) FILTER (WHERE date <= ${toDbDate(today)}::date), 0) AS posted,
             COALESCE(SUM(amount) FILTER (WHERE date > ${toDbDate(today)}::date), 0) AS scheduled
      FROM app.transactions
      WHERE "userId" = ${userId}::uuid
      GROUP BY "accountId", currency`;
    const result = new Map<string, Map<CurrencyCode, BalanceAmounts>>();
    for (const row of rows) {
      const byCurrency = result.get(row.accountId) ?? new Map<CurrencyCode, BalanceAmounts>();
      byCurrency.set(toCurrencyCode(row.currency), {
        posted: toMinor(row.posted),
        scheduled: toMinor(row.scheduled),
      });
      result.set(row.accountId, byCurrency);
    }
    return result;
  },
};
