import type { Food as FoodRow, FoodCategory as FoodCategoryRow } from "@/generated/prisma/client";
import { type Db, isForeignKeyViolation, prisma } from "@/shared/infrastructure";
import type { Food, FoodCategory, FoodMeasure } from "../domain/food";
import { type FoodIconKey, isFoodIconKey } from "../domain/food-icons";

function toCategory(row: FoodCategoryRow): FoodCategory {
  return { id: row.id, name: row.name, archived: row.archivedAt !== null };
}

function toFood(row: FoodRow): Food {
  return {
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    // An icon removed from the catalog shows the default one.
    icon: isFoodIconKey(row.icon) ? row.icon : null,
    measure: row.measure,
    unitLabel: row.unitLabel,
    unitSize: row.unitSize.toNumber(),
    stock: row.stock.toNumber(),
    archived: row.archivedAt !== null,
  };
}

const archivedFilter = (includeArchived = false) => (includeArchived ? {} : { archivedAt: null });

async function deleteOrInUse(work: () => Promise<unknown>): Promise<"deleted" | "in_use"> {
  try {
    await work();
    return "deleted";
  } catch (error) {
    if (isForeignKeyViolation(error)) return "in_use";
    throw error;
  }
}

export const foodCategoryRepository = {
  async list(userId: string, options: { includeArchived?: boolean } = {}) {
    const rows = await prisma.foodCategory.findMany({
      where: { userId, ...archivedFilter(options.includeArchived) },
      orderBy: { name: "asc" },
    });
    return rows.map(toCategory);
  },

  async findById(userId: string, id: string, db: Db = prisma): Promise<FoodCategory | null> {
    const row = await db.foodCategory.findFirst({ where: { id, userId } });
    return row ? toCategory(row) : null;
  },

  /** Categories among `ids` that belong to the user and are active. */
  async countActive(userId: string, ids: readonly string[], db: Db = prisma): Promise<number> {
    return db.foodCategory.count({ where: { userId, id: { in: [...ids] }, archivedAt: null } });
  },

  async existsWithName(userId: string, name: string, exceptId?: string): Promise<boolean> {
    const count = await prisma.foodCategory.count({
      where: {
        userId,
        name: { equals: name, mode: "insensitive" },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
    });
    return count > 0;
  },

  async create(userId: string, name: string): Promise<FoodCategory> {
    return toCategory(await prisma.foodCategory.create({ data: { userId, name } }));
  },

  async rename(userId: string, id: string, name: string): Promise<void> {
    await prisma.foodCategory.updateMany({ where: { id, userId }, data: { name } });
  },

  async setArchived(userId: string, id: string, archived: boolean): Promise<void> {
    await prisma.foodCategory.updateMany({
      where: { id, userId },
      data: { archivedAt: archived ? new Date() : null },
    });
  },

  /** Fails with "in_use" while foods or blocks reference it (ON DELETE RESTRICT). */
  delete(userId: string, id: string) {
    return deleteOrInUse(() => prisma.foodCategory.deleteMany({ where: { id, userId } }));
  },
};

export type FoodData = {
  categoryId: string;
  name: string;
  icon: FoodIconKey | null;
  measure: FoodMeasure;
  unitLabel: string | null;
  unitSize: number;
};

export const foodRepository = {
  async list(userId: string, options: { includeArchived?: boolean } = {}) {
    const rows = await prisma.food.findMany({
      where: { userId, ...archivedFilter(options.includeArchived) },
      orderBy: { name: "asc" },
    });
    return rows.map(toFood);
  },

  async findById(userId: string, id: string, db: Db = prisma): Promise<Food | null> {
    const row = await db.food.findFirst({ where: { id, userId } });
    return row ? toFood(row) : null;
  },

  /** The user's foods among `ids` (others' ids are simply not returned). */
  async findMany(userId: string, ids: readonly string[], db: Db = prisma): Promise<Food[]> {
    const rows = await db.food.findMany({ where: { userId, id: { in: [...ids] } } });
    return rows.map(toFood);
  },

  async existsWithName(userId: string, name: string, exceptId?: string): Promise<boolean> {
    const count = await prisma.food.count({
      where: {
        userId,
        name: { equals: name, mode: "insensitive" },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
    });
    return count > 0;
  },

  async create(userId: string, data: FoodData & { stock: number }): Promise<Food> {
    return toFood(await prisma.food.create({ data: { userId, ...data } }));
  },

  async update(userId: string, id: string, data: FoodData & { stock?: number }): Promise<void> {
    await prisma.food.updateMany({ where: { id, userId }, data });
  },

  async setArchived(userId: string, id: string, archived: boolean): Promise<void> {
    await prisma.food.updateMany({
      where: { id, userId },
      data: { archivedAt: archived ? new Date() : null },
    });
  },

  /** Fails with "in_use" while a meal references it (ON DELETE RESTRICT). */
  delete(userId: string, id: string) {
    return deleteOrInUse(() => prisma.food.deleteMany({ where: { id, userId } }));
  },

  async setStock(userId: string, id: string, stock: number, db: Db = prisma): Promise<void> {
    await db.food.updateMany({ where: { id, userId }, data: { stock } });
  },

  /** Adds (or, with a negative `delta`, removes) stock. Callers keep it from going negative. */
  async changeStock(userId: string, id: string, delta: number, db: Db = prisma): Promise<void> {
    if (delta === 0) return;
    await db.food.updateMany({ where: { id, userId }, data: { stock: { increment: delta } } });
  },
};
