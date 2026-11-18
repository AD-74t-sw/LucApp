import { describe, expect, it } from "vitest";
import { convertAmount, parseAmount, splitEvenly, toDecimalString } from "./money";

describe("parseAmount", () => {
  it.each([
    ["12.500", "CLP", 12500],
    ["12500", "CLP", 12500],
    ["$ 1.250.000", "CLP", 1250000],
    ["1.234,56", "USD", 123456],
    ["1,234.56", "USD", 123456],
    ["12,5", "USD", 1250],
    ["12.500", "USD", 1250000],
    ["0.99", "USD", 99],
    ["-30", "USD", -3000],
  ] as const)("parses %s %s as %d minor units", (input, currency, expected) => {
    expect(parseAmount(input, currency)).toEqual({ ok: true, value: expected });
  });

  it.each(["", "abc", "1.2.3,4,5x", "--3"])("rejects %j", (input) => {
    expect(parseAmount(input, "USD").ok).toBe(false);
  });
});

describe("toDecimalString", () => {
  it("is the inverse of parseAmount", () => {
    expect(toDecimalString(123456, "USD")).toBe("1234.56");
    expect(toDecimalString(1250, "USD")).toBe("12.5");
    expect(toDecimalString(5, "USD")).toBe("0.05");
    expect(toDecimalString(-3000, "USD")).toBe("-30");
    expect(toDecimalString(12500, "CLP")).toBe("12500");
  });
});

describe("splitEvenly", () => {
  it("adds up exactly to the total, remainder on the first part", () => {
    expect(splitEvenly(100, 3)).toEqual([34, 33, 33]);
    expect(splitEvenly(100000, 6).reduce((a, b) => a + b, 0)).toBe(100000);
  });

  it("rejects invalid part counts", () => {
    expect(() => splitEvenly(100, 0)).toThrow();
  });
});

describe("convertAmount", () => {
  it("scales between currencies with different minor units", () => {
    // 10.00 USD at 950 CLP/USD = 9500 CLP
    expect(convertAmount(1000, "USD", "CLP", 950)).toBe(9500);
    // 9500 CLP at 1/950 USD/CLP = 10.00 USD
    expect(convertAmount(9500, "CLP", "USD", 1 / 950)).toBe(1000);
  });

  it("rounds half away from zero symmetrically", () => {
    expect(convertAmount(1, "USD", "CLP", 950)).toBe(10); // 9.5 -> 10
    expect(convertAmount(-1, "USD", "CLP", 950)).toBe(-10);
  });

  it("returns the same amount for the same currency", () => {
    expect(convertAmount(1234, "CLP", "CLP", 2)).toBe(1234);
  });
});
