import type { Prisma } from "@/generated/prisma/client";
import type { LocalTime } from "@/shared/domain";
import { type Db, isForeignKeyViolation, prisma, runInTransaction } from "@/shared/infrastructure";
import type { BlockPortion, MealBlock } from "../domain/block";

const blockInclude = { portions: true } satisfies Prisma.MealBlockInclude;
type BlockRow = Prisma.MealBlockGetPayload<{ include: typeof blockInclude }>;

function toBlock(row: BlockRow): MealBlock {
  return {
    id: row.id,
    name: row.name,
    startTime: row.startTime as LocalTime,
    endTime: row.endTime as LocalTime,
    notify: row.notify,
    archived: row.archivedAt !== null,
    portions: row.portions.map((p) => ({
      categoryId: p.categoryId,
      servings: p.servings.toNumber(),
    })),
  };
}

export type BlockData = {
  name: string;
  startTime: LocalTime;
  endTime: LocalTime;
  notify: boolean;
};

function portionRows(userId: string, blockId: string, portions: readonly BlockPortion[]) {
  return portions.map((p) => ({ userId, blockId, categoryId: p.categoryId, servings: p.servings }));
}

export const blockRepository = {
  async list(userId: string, options: { includeArchived?: boolean } = {}): Promise<MealBlock[]> {
    const rows = await prisma.mealBlock.findMany({
      where: { userId, ...(options.includeArchived ? {} : { archivedAt: null }) },
      include: blockInclude,
      orderBy: [{ startTime: "asc" }, { name: "asc" }],
    });
    return rows.map(toBlock);
  },

  async findById(userId: string, id: string, db: Db = prisma): Promise<MealBlock | null> {
    const row = await db.mealBlock.findFirst({ where: { id, userId }, include: blockInclude });
    return row ? toBlock(row) : null;
  },

  async create(
    userId: string,
    data: BlockData,
    portions: readonly BlockPortion[],
  ): Promise<MealBlock> {
    return runInTransaction(async (tx) => {
      const block = await tx.mealBlock.create({ data: { userId, ...data } });
      await tx.mealBlockPortion.createMany({ data: portionRows(userId, block.id, portions) });
      return toBlock(
        await tx.mealBlock.findUniqueOrThrow({ where: { id: block.id }, include: blockInclude }),
      );
    });
  },

  /** Updates the block and replaces the servings it asks for. */
  async update(
    userId: string,
    id: string,
    data: BlockData,
    portions: readonly BlockPortion[],
  ): Promise<void> {
    await runInTransaction(async (tx) => {
      await tx.mealBlock.updateMany({ where: { id, userId }, data });
      await tx.mealBlockPortion.deleteMany({ where: { userId, blockId: id } });
      await tx.mealBlockPortion.createMany({ data: portionRows(userId, id, portions) });
    });
  },

  async setArchived(userId: string, id: string, archived: boolean): Promise<void> {
    await prisma.mealBlock.updateMany({
      where: { id, userId },
      data: { archivedAt: archived ? new Date() : null },
    });
  },

  /** Fails with "in_use" when meals were recorded for it (their history stays). */
  async delete(userId: string, id: string): Promise<"deleted" | "in_use"> {
    try {
      await prisma.mealBlock.deleteMany({ where: { id, userId } });
      return "deleted";
    } catch (error) {
      if (isForeignKeyViolation(error)) return "in_use";
      throw error;
    }
  },
};
