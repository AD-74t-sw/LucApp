import type { CostType, Necessity } from "@/modules/categories";
import { type CurrencyCode, type LocalDate, toCurrencyCode } from "@/shared/domain";
import { type Db, prisma, toBigInt, toDbDate, toLocalDate, toMinor } from "@/shared/infrastructure";
import type { InstallmentPlan } from "../domain/installment-schedule";

export type NewInstallmentPlan = {
  accountId: string;
  cardId: string | null;
  categoryId: string;
  description: string;
  totalAmount: number;
  currency: CurrencyCode;
  installmentCount: number;
  firstChargeDate: LocalDate;
  costType: CostType | null;
  necessity: Necessity | null;
};

export type InstallmentPlanDetails = InstallmentPlan & {
  currency: CurrencyCode;
  accountName: string;
  cardName: string | null;
  categoryName: string;
  installments: { date: LocalDate; amount: number }[];
};

export const installmentRepository = {
  async create(userId: string, data: NewInstallmentPlan, db: Db = prisma): Promise<string> {
    const row = await db.installmentPlan.create({
      data: {
        userId,
        ...data,
        totalAmount: toBigInt(data.totalAmount),
        firstChargeDate: toDbDate(data.firstChargeDate),
      },
      select: { id: true },
    });
    return row.id;
  },

  async exists(userId: string, id: string): Promise<boolean> {
    return (await prisma.installmentPlan.count({ where: { id, userId } })) > 0;
  },

  /** Deleting a plan deletes its installments (ON DELETE CASCADE). */
  async delete(userId: string, id: string): Promise<void> {
    await prisma.installmentPlan.deleteMany({ where: { id, userId } });
  },

  async list(userId: string): Promise<InstallmentPlanDetails[]> {
    const rows = await prisma.installmentPlan.findMany({
      where: { userId },
      include: {
        account: { select: { name: true } },
        card: { select: { name: true } },
        category: { select: { name: true } },
        transactions: { select: { date: true, amount: true }, orderBy: { date: "asc" } },
      },
      orderBy: { firstChargeDate: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      accountId: row.accountId,
      cardId: row.cardId,
      categoryId: row.categoryId,
      description: row.description,
      totalAmount: toMinor(row.totalAmount),
      installmentCount: row.installmentCount,
      firstChargeDate: toLocalDate(row.firstChargeDate),
      currency: toCurrencyCode(row.currency),
      accountName: row.account.name,
      cardName: row.card?.name ?? null,
      categoryName: row.category.name,
      installments: row.transactions.map((t) => ({
        date: toLocalDate(t.date),
        amount: toMinor(t.amount),
      })),
    }));
  },
};
