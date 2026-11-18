import { describe, expect, it } from "vitest";
import type { LocalDate } from "@/shared/domain";
import { buildInstallmentSchedule, installmentProgress } from "./installment-schedule";

describe("buildInstallmentSchedule", () => {
  it("splits the total exactly and charges monthly", () => {
    const schedule = buildInstallmentSchedule(100000, 3, "2026-01-31" as LocalDate);
    expect(schedule.map((i) => i.amount)).toEqual([33334, 33333, 33333]);
    expect(schedule.reduce((sum, i) => sum + i.amount, 0)).toBe(100000);
    expect(schedule.map((i) => i.date)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
    expect(schedule.map((i) => i.number)).toEqual([1, 2, 3]);
  });

  it("rejects invalid input", () => {
    expect(() => buildInstallmentSchedule(0, 3, "2026-01-01" as LocalDate)).toThrow();
    expect(() => buildInstallmentSchedule(100, 61, "2026-01-01" as LocalDate)).toThrow();
  });
});

describe("installmentProgress", () => {
  it("separates charged and pending installments", () => {
    const progress = installmentProgress(
      [
        { date: "2026-10-05" as LocalDate, amount: -100 },
        { date: "2026-11-05" as LocalDate, amount: -100 },
        { date: "2026-12-05" as LocalDate, amount: -100 },
      ],
      "2026-11-14" as LocalDate,
    );
    expect(progress).toEqual({
      charged: 2,
      chargedAmount: 200,
      remainingAmount: 100,
      nextChargeDate: "2026-12-05",
    });
  });
});
