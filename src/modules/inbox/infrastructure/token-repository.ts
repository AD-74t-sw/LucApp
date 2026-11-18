import { prisma } from "@/shared/infrastructure";

export type IngestTokenSummary = Readonly<{
  id: string;
  name: string;
  lastUsedAt: Date | null;
  createdAt: Date;
}>;

const summary = { id: true, name: true, lastUsedAt: true, createdAt: true } as const;

export const tokenRepository = {
  async create(userId: string, name: string, tokenHash: string): Promise<IngestTokenSummary> {
    return prisma.ingestToken.create({ data: { userId, name, tokenHash }, select: summary });
  },

  async list(userId: string): Promise<IngestTokenSummary[]> {
    return prisma.ingestToken.findMany({
      where: { userId },
      select: summary,
      orderBy: { createdAt: "desc" },
    });
  },

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await prisma.ingestToken.deleteMany({ where: { userId, id } });
    return result.count > 0;
  },

  /** The owner of a token, marking it as used. */
  async use(tokenHash: string): Promise<string | null> {
    const token = await prisma.ingestToken.findUnique({ where: { tokenHash } });
    if (!token) return null;
    await prisma.ingestToken.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } });
    return token.userId;
  },
};
