import { describe, expect, it } from "vitest";
import { countUnit, editableNumber, formatAmount, formatServings, pluralize } from "./format";

describe("meal quantities as shown", () => {
  it("pluralizes the units people name", () => {
    expect(pluralize("taza")).toBe("tazas");
    expect(pluralize("plato")).toBe("platos");
    expect(pluralize("porción")).toBe("porciones");
    expect(pluralize("pan")).toBe("panes");
    expect(pluralize("nuez")).toBe("nueces");
    expect(pluralize("rebanadas")).toBe("rebanadas");
    expect(countUnit(1, "taza")).toBe("taza");
    expect(countUnit(2, null)).toBe("unidades");
  });

  it("formats amounts and servings with a decimal comma", () => {
    expect(formatAmount(1500, "MASS")).toBe("1,5 kg");
    expect(formatAmount(250, "VOLUME")).toBe("250 ml");
    expect(formatAmount(0.5, "COUNT")).toBe("0,5 unidades");
    expect(formatAmount(1, "COUNT", "taza")).toBe("1 taza");
    expect(formatAmount(2.5, "COUNT", "taza")).toBe("2,5 tazas");
    expect(formatServings(1)).toBe("1 porción");
    expect(formatServings(1.5)).toBe("1,5 porciones");
    expect(editableNumber(0.75)).toBe("0,75");
  });
});
