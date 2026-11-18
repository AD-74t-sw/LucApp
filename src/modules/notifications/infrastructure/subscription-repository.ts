import { type Db, isUniqueViolation, prisma } from "@/shared/infrastructure";
import type { PushTarget } from "../domain/push";

export const subscriptionRepository = {
  /**
   * Saves a device's subscription. The endpoint is unique per device: if it
   * belonged to another account (someone else signed in on this phone), it
   * moves to this one.
   */
  async save(
    userId: string,
    target: PushTarget,
    userAgent: string | null,
    db: Db = prisma,
  ): Promise<void> {
    await db.pushSubscription.upsert({
      where: { endpoint: target.endpoint },
      create: { userId, ...target, userAgent },
      update: { userId, p256dh: target.p256dh, auth: target.auth, userAgent },
    });
  },

  async remove(userId: string, endpoint: string): Promise<void> {
    await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  },

  /** Forgets a subscription the push service reported as gone. */
  async removeGone(endpoint: string): Promise<void> {
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  },

  async listFor(userId: string): Promise<PushTarget[]> {
    return prisma.pushSubscription.findMany({
      where: { userId },
      select: { endpoint: true, p256dh: true, auth: true },
      orderBy: { createdAt: "asc" },
    });
  },

  async count(userId: string): Promise<number> {
    return prisma.pushSubscription.count({ where: { userId } });
  },

  /** Every user with at least one device (used by the scheduler, across users). */
  async usersWithDevices(): Promise<string[]> {
    const rows = await prisma.pushSubscription.findMany({
      distinct: ["userId"],
      select: { userId: true },
    });
    return rows.map((row) => row.userId);
  },
};

export const deliveryRepository = {
  /**
   * Records that the notification `key` goes out now. Returns false when it
   * already went out (the unique key makes this safe under concurrent runs).
   */
  async claim(userId: string, key: string): Promise<boolean> {
    try {
      await prisma.notificationDelivery.create({ data: { userId, key } });
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  },

  async sentKeys(userId: string, prefix: string): Promise<Set<string>> {
    const rows = await prisma.notificationDelivery.findMany({
      where: { userId, key: { startsWith: prefix } },
      select: { key: true },
    });
    return new Set(rows.map((row) => row.key));
  },
};
