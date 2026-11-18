import { describe, expect, it } from "vitest";
import type { LocalDate } from "@/shared/domain";
import { isOwnName, isTransferPair } from "./own-transfer";

describe("isOwnName", () => {
  it("recognizes the person's own name as bank systems write it", () => {
    expect(isOwnName("LUCIA ANDREA PEREZ SOTO", "Lucía Pérez")).toBe(true);
    expect(isOwnName("Lucia Perez", "Lucía Pérez")).toBe(true);
  });

  it("does not take relatives or namesakes for the person", () => {
    expect(isOwnName("Lucia Gonzalez", "Lucía Pérez")).toBe(false);
    expect(isOwnName("Martin Perez", "Lucía Pérez")).toBe(false);
    expect(isOwnName(null, "Lucía Pérez")).toBe(false);
  });
});

describe("isTransferPair", () => {
  const sent = {
    kind: "TRANSFER_OUT" as const,
    amount: 100000,
    currency: "CLP" as const,
    occurredOn: "2026-11-14" as LocalDate,
    receivedAt: new Date("2026-11-14T13:00:00Z"),
  };

  it("pairs money sent from one bank with the same money received at another", () => {
    expect(isTransferPair(sent, { ...sent, kind: "TRANSFER_IN" }, "America/Santiago")).toBe(true);
  });

  it("does not pair different amounts or days far apart", () => {
    const received = { ...sent, kind: "TRANSFER_IN" as const };
    expect(isTransferPair(sent, { ...received, amount: 99000 }, "America/Santiago")).toBe(false);
    expect(
      isTransferPair(
        sent,
        { ...received, occurredOn: "2026-11-17" as LocalDate },
        "America/Santiago",
      ),
    ).toBe(false);
  });
});
