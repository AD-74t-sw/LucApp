import { describe, expect, it } from "vitest";
import { displayUnit, inUnit, parseQuantity, servingSize, servingsIn, toBaseAmount } from "./food";

const rice = { measure: "MASS" as const, unitSize: 80 };

describe("parseQuantity", () => {
  it("reads decimal commas, decimal points and thousands", () => {
    expect(parseQuantity("250")).toBe(250);
    expect(parseQuantity("1,5")).toBe(1.5);
    expect(parseQuantity("1.5")).toBe(1.5);
    expect(parseQuantity("1.000")).toBe(1000);
    expect(parseQuantity("1.250,5")).toBe(1250.5);
    expect(parseQuantity(" 2 ")).toBe(2);
  });

  it("rejects what is not a positive number", () => {
    expect(parseQuantity("")).toBeNull();
    expect(parseQuantity("-1")).toBeNull();
    expect(parseQuantity("abc")).toBeNull();
    expect(parseQuantity("1,2,3")).toBeNull();
  });
});

describe("toBaseAmount", () => {
  it("converts kilos, liters and servings to the base measure", () => {
    expect(toBaseAmount("1,5", "kg", rice)).toEqual({ ok: true, value: 1500 });
    expect(toBaseAmount("250", "g", rice)).toEqual({ ok: true, value: 250 });
    expect(toBaseAmount("3", "servings", rice)).toEqual({ ok: true, value: 240 });
    expect(toBaseAmount("2", "l", { measure: "VOLUME", unitSize: 200 })).toEqual({
      ok: true,
      value: 2000,
    });
    expect(toBaseAmount("12", "pieces", { measure: "COUNT", unitSize: 1 })).toEqual({
      ok: true,
      value: 12,
    });
  });

  it("rejects units of another measure, zero and nonsense", () => {
    expect(toBaseAmount("1", "l", rice).ok).toBe(false);
    expect(toBaseAmount("0", "g", rice).ok).toBe(false);
    expect(toBaseAmount("0", "g", rice, { allowZero: true })).toEqual({ ok: true, value: 0 });
    expect(toBaseAmount("0,0001", "kg", rice, { allowZero: true }).ok).toBe(false);
    expect(toBaseAmount("x", "g", rice).ok).toBe(false);
    expect(toBaseAmount("5000", "kg", rice).ok).toBe(false);
  });

  it("measures a serving", () => {
    expect(servingSize("150", "g")).toEqual({ ok: true, value: 150 });
    expect(servingSize("1", "l")).toEqual({ ok: true, value: 1000 });
    expect(servingSize("0", "g").ok).toBe(false);
  });
});

describe("servings and display", () => {
  it("counts whole servings in stock", () => {
    expect(servingsIn({ stock: 1000, unitSize: 80 })).toBe(12);
    expect(servingsIn({ stock: 79, unitSize: 80 })).toBe(0);
    expect(servingsIn({ stock: 0, unitSize: 1 })).toBe(0);
  });

  it("shows kilos and liters from a thousand up", () => {
    expect(displayUnit(800, "MASS")).toBe("g");
    expect(displayUnit(1500, "MASS")).toBe("kg");
    expect(displayUnit(1000, "VOLUME")).toBe("l");
    expect(displayUnit(5000, "COUNT")).toBe("pieces");
    expect(inUnit(1500, "kg")).toBe(1.5);
  });
});
