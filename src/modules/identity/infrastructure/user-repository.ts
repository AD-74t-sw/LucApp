import { toCurrencyCode } from "@/shared/domain";
import { type Db, prisma } from "@/shared/infrastructure";
import type { UserSettings } from "../domain/user";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  settings: UserSettings | null;
};

export const userRepository = {
  async findProfile(userId: string): Promise<UserProfile | null> {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      settings: row.settings
        ? {
            baseCurrency: toCurrencyCode(row.settings.baseCurrency),
            timezone: row.settings.timezone,
          }
        : null,
    };
  },

  /** Creates the profile and settings. Returns false if the profile already existed. */
  async createProfile(
    profile: { id: string; email: string; name: string; settings: UserSettings },
    db: Db = prisma,
  ): Promise<boolean> {
    const existing = await db.user.findUnique({ where: { id: profile.id }, select: { id: true } });
    if (existing) return false;
    await db.user.create({
      data: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        settings: { create: profile.settings },
      },
    });
    return true;
  },

  async saveSettings(userId: string, settings: UserSettings): Promise<UserSettings> {
    const row = await prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...settings },
      update: settings,
    });
    return { baseCurrency: toCurrencyCode(row.baseCurrency), timezone: row.timezone };
  },

  async updateName(userId: string, name: string): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { name } });
  },
};
