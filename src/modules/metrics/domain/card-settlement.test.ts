import { describe, expect, it } from "vitest";
import type { LocalDate } from "@/shared/domain";
import { valueCardCharges } from "./card-settlement";

const d = (value: string) => value as LocalDate;
// USD cents -> CLP pesos: rate 950 before November, 1000 from November on.
const convert = (cents: number, date: LocalDate) =>
  Math.round((cents / 100) * (date >= "2026-11-01" ? 1000 : 950));
const today = d("2026-11-14");

describe("valueCardCharges", () => {
  it("values unpaid charges at today's rate", () => {
    const values = valueCardCharges({
      openingDebt: 0,
      charges: [{ id: "a", date: d("2026-10-05"), amount: 10_000 }],
      payments: [],
      convert,
      today,
    });
    expect(values.get("a")).toBe(100_000); // USD 100 x 1000
  });

  it("values paid charges at what was actually paid, oldest first", () => {
    const values = valueCardCharges({
      openingDebt: 0,
      charges: [
        { id: "a", date: d("2026-10-05"), amount: 10_000 },
        { id: "b", date: d("2026-10-20"), amount: 10_000 },
      ],
      // Paid USD 150 with $142.500 (950 per dollar).
      payments: [{ date: d("2026-11-05"), amount: 15_000, baseAmount: 142_500 }],
      convert,
      today,
    });
    expect(values.get("a")).toBe(95_000); // fully settled at 950
    expect(values.get("b")).toBe(47_500 + 50_000); // half at 950, half pending at 1000
  });

  it("settles the opening debt before any charge", () => {
    const values = valueCardCharges({
      openingDebt: 5_000,
      charges: [{ id: "a", date: d("2026-10-05"), amount: 10_000 }],
      payments: [{ date: d("2026-11-05"), amount: 10_000, baseAmount: 95_000 }],
      convert,
      today,
    });
    // USD 50 of the payment went to the opening debt; the rest covers half the charge.
    expect(values.get("a")).toBe(47_500 + 50_000);
  });

  it("values payments without a known cost at their day's rate", () => {
    const values = valueCardCharges({
      openingDebt: 0,
      charges: [{ id: "a", date: d("2026-10-05"), amount: 10_000 }],
      payments: [{ date: d("2026-10-30"), amount: 10_000, baseAmount: null }],
      convert,
      today,
    });
    expect(values.get("a")).toBe(95_000);
  });

  it("returns null when a needed rate is unknown", () => {
    const values = valueCardCharges({
      openingDebt: 0,
      charges: [{ id: "a", date: d("2026-10-05"), amount: 10_000 }],
      payments: [],
      convert: () => null,
      today,
    });
    expect(values.get("a")).toBeNull();
  });
});
