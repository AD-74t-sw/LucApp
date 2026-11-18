import type { Prisma } from "@/generated/prisma/client";
import type { LocalDate, LocalTime } from "@/shared/domain";
import { type Db, prisma, toDbDate, toLocalDate } from "@/shared/infrastructure";
import type { Meal, MealItem } from "../domain/meal";
import type { MealSettings } from "../domain/settings";

const mealInclude = { items: { orderBy: { id: "asc" } } } satisfies Prisma.MealInclude;
type MealRow = Prisma.MealGetPayload<{ include: typeof mealInclude }>;

function toMeal(row: MealRow): Meal {
  return {
    id: row.id,
    blockId: row.blockId,
    date: toLocalDate(row.date),
    status: row.status,
    eatenAt: row.eatenAt,
    items: row.items.map((i) => ({ foodId: i.foodId, servings: i.servings, taken: i.taken })),
  };
}

function itemRows(userId: string, mealId: string, items: readonly MealItem[]) {
  return items.map((i) => ({
    userId,
    mealId,
    foodId: i.foodId,
    servings: i.servings,
    taken: i.taken,
  }));
}

export const mealRepository = {
  async listBetween(userId: string, from: LocalDate, to: LocalDate): Promise<Meal[]> {
    const rows = await prisma.meal.findMany({
      where: { userId, date: { gte: toDbDate(from), lte: toDbDate(to) } },
      include: mealInclude,
      orderBy: { date: "asc" },
    });
    return rows.map(toMeal);
  },

  async find(
    userId: string,
    blockId: string,
    date: LocalDate,
    db: Db = prisma,
  ): Promise<Meal | null> {
    const row = await db.meal.findFirst({
      where: { userId, blockId, date: toDbDate(date) },
      include: mealInclude,
    });
    return row ? toMeal(row) : null;
  },

  /** Creates the meal (or reuses it) with these items and status. */
  async save(
    userId: string,
    blockId: string,
    date: LocalDate,
    state: { status: Meal["status"]; eatenAt: Date | null; items: readonly MealItem[] },
    db: Db,
  ): Promise<void> {
    const existing = await db.meal.findFirst({
      where: { userId, blockId, date: toDbDate(date) },
      select: { id: true },
    });
    const id = existing
      ? existing.id
      : (await db.meal.create({ data: { userId, blockId, date: toDbDate(date) } })).id;
    await db.meal.updateMany({
      where: { id, userId },
      data: { status: state.status, eatenAt: state.eatenAt },
    });
    await db.mealItem.deleteMany({ where: { userId, mealId: id } });
    await db.mealItem.createMany({ data: itemRows(userId, id, state.items) });
  },

  async remove(userId: string, blockId: string, date: LocalDate, db: Db = prisma): Promise<void> {
    await db.meal.deleteMany({ where: { userId, blockId, date: toDbDate(date) } });
  },
};

export const mealSettingsRepository = {
  async find(userId: string): Promise<MealSettings | null> {
    const row = await prisma.mealSettings.findUnique({ where: { userId } });
    return row
      ? { coverageDays: row.coverageDays, shortageAlertTime: row.shortageAlertTime as LocalTime }
      : null;
  },

  async save(userId: string, settings: MealSettings): Promise<void> {
    await prisma.mealSettings.upsert({
      where: { userId },
      create: { userId, ...settings },
      update: settings,
    });
  },
};
