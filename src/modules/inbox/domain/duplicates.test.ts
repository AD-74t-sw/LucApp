import { describe, expect, it } from "vitest";
import type { LocalDate } from "@/shared/domain";
import { type KnownMovement, findDuplicate, sameMovement } from "./duplicates";
import type { NoticeChannel } from "./notice";

const TZ = "America/Santiago";

function notice(overrides: Partial<KnownMovement> = {}): KnownMovement {
  return {
    id: "n1",
    channels: ["EMAIL"],
    channel: "EMAIL",
    institution: "Banco de Chile",
    kind: "PURCHASE",
    instrument: null,
    amount: 12345,
    currency: "CLP",
    merchant: "LIDER EXPRESS 123",
    last4: "1234",
    occurredOn: "2026-11-14" as LocalDate,
    occurredTime: "12:34",
    receivedAt: new Date("2026-11-14T15:35:00Z"),
    status: "PENDING",
    transferGroupId: null,
    ...overrides,
  };
}

const sms = (overrides: Partial<KnownMovement> = {}) =>
  notice({ channel: "SMS" as NoticeChannel, channels: ["SMS"], ...overrides });

describe("sameMovement", () => {
  it("matches the email and the SMS of one purchase, written differently", () => {
    expect(
      sameMovement(notice(), sms({ merchant: "Lider Express", occurredTime: "12:35" }), TZ),
    ).toBe(true);
  });

  it("never merges two notices from the same channel (two equal coffees)", () => {
    expect(sameMovement(notice(), notice({ id: "n2" }), TZ)).toBe(false);
  });

  it("keeps apart different amounts, cards, merchants or times", () => {
    expect(sameMovement(notice(), sms({ amount: 12346 }), TZ)).toBe(false);
    expect(sameMovement(notice(), sms({ last4: "9999" }), TZ)).toBe(false);
    expect(sameMovement(notice(), sms({ merchant: "COPEC" }), TZ)).toBe(false);
    expect(sameMovement(notice(), sms({ occurredTime: "18:00" }), TZ)).toBe(false);
  });

  it("accepts missing details and an email that arrives the next day", () => {
    expect(
      sameMovement(
        notice({
          occurredOn: null,
          occurredTime: null,
          receivedAt: new Date("2026-11-15T11:00:00Z"),
        }),
        sms({ last4: null, merchant: null }),
        TZ,
      ),
    ).toBe(true);
  });
});

describe("notifications and Apple Pay", () => {
  const push = (overrides: Partial<KnownMovement> = {}) =>
    notice({
      channel: "PUSH",
      channels: ["PUSH"],
      occurredOn: null,
      occurredTime: null,
      merchant: "JUMBO LA REINA",
      ...overrides,
    });
  const wallet = (overrides: Partial<KnownMovement> = {}) =>
    notice({
      channel: "WALLET",
      channels: ["WALLET"],
      institution: null,
      last4: null,
      occurredOn: null,
      occurredTime: null,
      merchant: "Jumbo La Reina",
      receivedAt: new Date("2026-11-14T15:35:20Z"),
      ...overrides,
    });

  it("merges the bank's notification with the Apple Pay payment of one purchase", () => {
    expect(sameMovement(push(), wallet(), TZ)).toBe(true);
  });

  it("pairs two equal purchases with their own Apple Pay payments", () => {
    const known = [push({ id: "first" }), push({ id: "second" })];
    const first = findDuplicate(wallet(), known, TZ);
    expect(first).not.toBeNull();
    const remaining = known.map((k) =>
      k.id === first?.id ? { ...k, channels: ["PUSH", "WALLET"] as const } : k,
    );
    expect(findDuplicate(wallet(), remaining, TZ)?.id).not.toBe(first?.id);
  });
});

describe("findDuplicate", () => {
  it("skips movements that already have a notice from this channel", () => {
    const known = [notice({ id: "a", channels: ["EMAIL", "SMS"] }), notice({ id: "b" })];
    expect(findDuplicate(sms(), known, TZ)?.id).toBe("b");
  });

  it("returns null when nothing matches", () => {
    expect(findDuplicate(sms({ amount: 1 }), [notice()], TZ)).toBeNull();
  });
});
