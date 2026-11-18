import { type Db, prisma } from "@/shared/infrastructure";

export type NoticeRule = Readonly<{
  merchantKey: string;
  kind: "EXPENSE" | "INCOME" | "TRANSFER";
  categoryId: string | null;
  accountId: string | null;
  cardId: string | null;
  toAccountId: string | null;
}>;

const fields = {
  merchantKey: true,
  kind: true,
  categoryId: true,
  accountId: true,
  cardId: true,
  toAccountId: true,
} as const;

export const ruleRepository = {
  async findMany(userId: string, keys: readonly string[]): Promise<NoticeRule[]> {
    if (keys.length === 0) return [];
    const rows = await prisma.noticeRule.findMany({
      where: { userId, merchantKey: { in: [...keys] } },
      select: fields,
    });
    return rows.filter((r): r is typeof r & { kind: NoticeRule["kind"] } => r.kind !== "DEBT");
  },

  async save(userId: string, rule: NoticeRule, db: Db = prisma): Promise<void> {
    const { merchantKey, ...data } = rule;
    await db.noticeRule.upsert({
      where: { userId_merchantKey: { userId, merchantKey } },
      create: { userId, merchantKey, ...data },
      update: data,
    });
  },
};
