import type { Prisma } from "@/generated/prisma/client";
import { type CurrencyCode, type LocalDate, toCurrencyCode } from "@/shared/domain";
import {
  type Db,
  isUniqueViolation,
  prisma,
  toBigInt,
  toDbDate,
  toDbDateOrNull,
  toLocalDate,
  toLocalDateOrNull,
  toMinor,
} from "@/shared/infrastructure";
import type { CostType, Necessity } from "@/modules/categories";
import type { Debt, DebtDirection, Person } from "../domain/debt";

const debtInclude = {
  payments: { orderBy: { date: "asc" } },
  category: { select: { name: true, color: true } },
} as const;
type DebtRow = Prisma.DebtGetPayload<{ include: typeof debtInclude }>;

/** Debt plus what the screens need to show its category. */
export type DebtListItem = Debt & { categoryName: string | null; categoryColor: string | null };

function toDebt(row: DebtRow): DebtListItem {
  return {
    id: row.id,
    personId: row.personId,
    direction: row.direction,
    principal: toMinor(row.principal),
    currency: toCurrencyCode(row.currency),
    date: toLocalDate(row.date),
    dueDate: toLocalDateOrNull(row.dueDate),
    description: row.description,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
    categoryColor: row.category?.color ?? null,
    costType: row.costType,
    necessity: row.necessity,
    settled: row.settledAt !== null,
    transactionId: row.transactionId,
    payments: row.payments.map((p) => ({
      id: p.id,
      debtId: p.debtId,
      amount: toMinor(p.amount),
      date: toLocalDate(p.date),
      note: p.note,
      transactionId: p.transactionId,
    })),
  };
}

export const personRepository = {
  async list(userId: string): Promise<Person[]> {
    return prisma.person.findMany({
      where: { userId },
      select: { id: true, name: true, note: true },
      orderBy: { name: "asc" },
    });
  },

  async findById(userId: string, id: string): Promise<Person | null> {
    return prisma.person.findFirst({
      where: { id, userId },
      select: { id: true, name: true, note: true },
    });
  },

  /** Returns null when the name is already used. */
  async create(
    userId: string,
    data: { name: string; note: string | null },
  ): Promise<Person | null> {
    try {
      return await prisma.person.create({
        data: { userId, ...data },
        select: { id: true, name: true, note: true },
      });
    } catch (error) {
      if (isUniqueViolation(error)) return null;
      throw error;
    }
  },

  /** Returns false when the name is already used. */
  async update(
    userId: string,
    id: string,
    data: { name: string; note: string | null },
  ): Promise<boolean> {
    try {
      await prisma.person.updateMany({ where: { id, userId }, data });
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  },

  /** Debts and payments are removed with the person (ON DELETE CASCADE). */
  async delete(userId: string, id: string, db: Db = prisma): Promise<void> {
    await db.person.deleteMany({ where: { id, userId } });
  },
};

/** Fields that can change after the debt is created (currency and account cannot). */
export type DebtChanges = {
  personId: string;
  direction: DebtDirection;
  principal: number;
  date: LocalDate;
  dueDate: LocalDate | null;
  description: string;
  categoryId: string;
  costType: CostType | null;
  necessity: Necessity | null;
};

export type NewDebt = DebtChanges & { currency: CurrencyCode; transactionId: string | null };

export const debtRepository = {
  async list(userId: string, options: { personId?: string } = {}): Promise<DebtListItem[]> {
    const rows = await prisma.debt.findMany({
      where: { userId, ...(options.personId ? { personId: options.personId } : {}) },
      include: debtInclude,
      orderBy: [{ settledAt: { sort: "asc", nulls: "first" } }, { date: "desc" }],
    });
    return rows.map(toDebt);
  },

  async findById(userId: string, id: string, db: Db = prisma): Promise<DebtListItem | null> {
    const row = await db.debt.findFirst({ where: { id, userId }, include: debtInclude });
    return row ? toDebt(row) : null;
  },

  async create(userId: string, data: NewDebt, db: Db = prisma): Promise<string> {
    const row = await db.debt.create({
      data: {
        userId,
        ...data,
        principal: toBigInt(data.principal),
        date: toDbDate(data.date),
        dueDate: toDbDateOrNull(data.dueDate),
      },
      select: { id: true },
    });
    return row.id;
  },

  async update(userId: string, id: string, data: DebtChanges, db: Db = prisma): Promise<void> {
    await db.debt.updateMany({
      where: { id, userId },
      data: {
        ...data,
        principal: toBigInt(data.principal),
        date: toDbDate(data.date),
        dueDate: toDbDateOrNull(data.dueDate),
      },
    });
  },

  async addPayment(
    userId: string,
    debtId: string,
    data: { amount: number; date: LocalDate; note: string | null; transactionId: string | null },
    db: Db = prisma,
  ): Promise<void> {
    await db.debtPayment.create({
      data: { userId, debtId, ...data, amount: toBigInt(data.amount), date: toDbDate(data.date) },
    });
  },

  async updatePayment(
    userId: string,
    paymentId: string,
    data: { amount: number; date: LocalDate; note: string | null },
    db: Db = prisma,
  ): Promise<void> {
    await db.debtPayment.updateMany({
      where: { id: paymentId, userId },
      data: { ...data, amount: toBigInt(data.amount), date: toDbDate(data.date) },
    });
  },

  async findPayment(userId: string, paymentId: string) {
    return prisma.debtPayment.findFirst({
      where: { id: paymentId, userId },
      select: { id: true, debtId: true, transactionId: true },
    });
  },

  async deletePayment(userId: string, paymentId: string, db: Db = prisma): Promise<void> {
    await db.debtPayment.deleteMany({ where: { id: paymentId, userId } });
  },

  /** Marks the debt settled (keeping the original date if it already was) or open again. */
  async setSettled(userId: string, id: string, settled: boolean, db: Db = prisma): Promise<void> {
    await db.debt.updateMany({
      where: settled ? { id, userId, settledAt: null } : { id, userId },
      data: { settledAt: settled ? new Date() : null },
    });
  },

  async delete(userId: string, id: string, db: Db = prisma): Promise<void> {
    await db.debt.deleteMany({ where: { id, userId } });
  },
};
