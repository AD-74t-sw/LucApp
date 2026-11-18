import type { Card as CardRow, FinancialAccount } from "@/generated/prisma/client";
import { type Db, prisma } from "@/shared/infrastructure";
import { type Card, type CardNetwork, cardKind } from "../domain/card";

type RowWithAccount = CardRow & { account: Pick<FinancialAccount, "type"> };

function toDomain(row: RowWithAccount): Card {
  return {
    id: row.id,
    accountId: row.accountId,
    name: row.name,
    network: row.network,
    last4: row.last4,
    archived: row.archivedAt !== null,
    kind: cardKind(row.account.type),
  };
}

const include = { account: { select: { type: true } } } as const;

export type CardData = { name: string; network: CardNetwork; last4: string | null };

export const cardRepository = {
  async list(userId: string, options: { includeArchived?: boolean } = {}): Promise<Card[]> {
    const rows = await prisma.card.findMany({
      where: { userId, ...(options.includeArchived ? {} : { archivedAt: null }) },
      include,
      orderBy: { name: "asc" },
    });
    return rows.map(toDomain);
  },

  async findById(userId: string, id: string, db: Db = prisma): Promise<Card | null> {
    const row = await db.card.findFirst({ where: { id, userId }, include });
    return row ? toDomain(row) : null;
  },

  async create(userId: string, accountId: string, data: CardData): Promise<Card> {
    return toDomain(await prisma.card.create({ data: { userId, accountId, ...data }, include }));
  },

  async update(userId: string, id: string, data: CardData): Promise<void> {
    await prisma.card.updateMany({ where: { id, userId }, data });
  },

  async setArchived(userId: string, id: string, archived: boolean): Promise<void> {
    await prisma.card.updateMany({
      where: { id, userId },
      data: { archivedAt: archived ? new Date() : null },
    });
  },

  /** Movements keep their history: the FK sets their card to null. */
  async delete(userId: string, id: string): Promise<void> {
    await prisma.card.deleteMany({ where: { id, userId } });
  },
};
