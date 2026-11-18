import { describe, expect, it } from "vitest";
import type { LocalDate } from "@/shared/domain";
import { createRateTable, parseRate } from "./rate-table";

const d = (value: string) => value as LocalDate;

describe("rate table", () => {
  const table = createRateTable([
    { from: "USD", to: "CLP", date: d("2026-01-01"), rate: 900 },
    { from: "USD", to: "CLP", date: d("2026-06-01"), rate: 950 },
  ]);

  it("uses the latest rate on or before the date", () => {
    expect(table.rateFor("USD", "CLP", d("2026-05-31"))).toBe(900);
    expect(table.rateFor("USD", "CLP", d("2026-06-01"))).toBe(950);
    expect(table.rateFor("USD", "CLP", d("2027-01-01"))).toBe(950);
  });

  it("falls back to the oldest rate for earlier dates", () => {
    expect(table.rateFor("USD", "CLP", d("2025-01-01"))).toBe(900);
  });

  it("derives inverse rates and converts amounts", () => {
    expect(table.convert(950_000, "CLP", "USD", d("2026-07-01"))).toBe(100_000); // 1000.00 USD
    expect(table.convert(1000, "USD", "CLP", d("2026-07-01"))).toBe(9500);
  });

  it("returns null when no rate is known", () => {
    expect(createRateTable([]).convert(100, "USD", "CLP", d("2026-07-01"))).toBeNull();
    expect(table.convert(100, "CLP", "CLP", d("2026-07-01"))).toBe(100);
  });

  it("parses rates typed with comma or dot", () => {
    expect(parseRate("950,5")).toEqual({ ok: true, value: 950.5 });
    expect(parseRate("0.00105")).toEqual({ ok: true, value: 0.00105 });
    expect(parseRate("0").ok).toBe(false);
    expect(parseRate("abc").ok).toBe(false);
  });
});
