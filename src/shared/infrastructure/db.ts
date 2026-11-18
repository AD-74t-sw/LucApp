import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";
import { env } from "./env";

/** Either the root client or the client of an open interactive transaction. */
export type Db = PrismaClient | Prisma.TransactionClient;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Postgres schema that holds the application tables (see prisma/schema.prisma).
 * The pg driver adapter needs it explicitly: it does not read `@@schema`.
 */
export const APP_SCHEMA = "app";

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env().DATABASE_URL }, { schema: APP_SCHEMA });
  return new PrismaClient({ adapter });
}

/** Single client per process (reused across hot reloads in development). */
export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Runs `work` atomically. Repositories accept an optional `db` argument so a
 * use case can pass the transaction client to every write it performs.
 */
export function runInTransaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(work);
}
