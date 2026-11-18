import { describe, expect, it } from "vitest";
import {
  type LocalDate,
  type MonthKey,
  addMonths,
  isLocalDate,
  lastDayOfMonth,
  monthsEndingAt,
  today,
} from "./local-date";

describe("local dates", () => {
  it("validates calendar dates", () => {
    expect(isLocalDate("2026-02-28")).toBe(true);
    expect(isLocalDate("2026-02-29")).toBe(false);
    expect(isLocalDate("2028-02-29")).toBe(true);
    expect(isLocalDate("2026-13-01")).toBe(false);
  });

  it("adds months clamping to the end of the month", () => {
    expect(addMonths("2026-01-31" as LocalDate, 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31" as LocalDate, 1)).toBe("2028-02-29");
    expect(addMonths("2026-11-15" as LocalDate, 3)).toBe("2027-02-15");
    expect(addMonths("2026-03-31" as LocalDate, -1)).toBe("2026-02-28");
  });

  it("computes today in the user's time zone", () => {
    const instant = new Date("2026-11-15T02:30:00Z"); // still Nov 14 in Santiago (UTC-3)
    expect(today("America/Santiago", instant)).toBe("2026-11-14");
    expect(today("UTC", instant)).toBe("2026-11-15");
  });

  it("lists months ending at a month", () => {
    expect(monthsEndingAt("2026-02" as MonthKey, 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
    expect(lastDayOfMonth("2026-02" as MonthKey)).toBe("2026-02-28");
  });
});
