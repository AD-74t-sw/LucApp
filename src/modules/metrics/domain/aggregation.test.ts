import { describe, expect, it } from "vitest";
import type { LocalDate } from "@/shared/domain";
import { BaseCurrencySum, rollupByParent, savingsRate, splitByClassification } from "./aggregation";

describe("metrics aggregation", () => {
  it("rolls subcategories up into their parent, biggest first", () => {
    const slices = rollupByParent([
      {
        categoryId: "sup",
        name: "Supermercado",
        color: "#1",
        parentId: "food",
        parentName: "Alimentación",
        parentColor: "#f",
        amount: 300,
      },
      {
        categoryId: "rest",
        name: "Restaurantes",
        color: "#1",
        parentId: "food",
        parentName: "Alimentación",
        parentColor: "#f",
        amount: 100,
      },
      {
        categoryId: "food",
        name: "Alimentación",
        color: "#f",
        parentId: null,
        parentName: null,
        parentColor: null,
        amount: 50,
      },
      {
        categoryId: "home",
        name: "Vivienda",
        color: "#h",
        parentId: null,
        parentName: null,
        parentColor: null,
        amount: 550,
      },
    ]);
    expect(slices.map((s) => [s.name, s.amount, s.share])).toEqual([
      ["Vivienda", 550, 0.55],
      ["Alimentación", 450, 0.45],
    ]);
    expect(slices[1]!.children.map((c) => c.name)).toEqual(["Supermercado", "Restaurantes"]);
  });

  it("splits spending by classification, keeping unclassified apart", () => {
    const split = splitByClassification([
      { costType: "FIXED", necessity: "ESSENTIAL", amount: 500 },
      { costType: "VARIABLE", necessity: "DISCRETIONARY", amount: 200 },
      { costType: null, necessity: null, amount: 50 },
    ]);
    expect(split.costType).toEqual({ FIXED: 500, VARIABLE: 200, UNCLASSIFIED: 50 });
    expect(split.necessity).toEqual({ ESSENTIAL: 500, DISCRETIONARY: 200, UNCLASSIFIED: 50 });
  });

  it("reports currencies without a rate instead of guessing", () => {
    const sum = new BaseCurrencySum((amount, currency) => (currency === "CLP" ? amount : null));
    const date = "2026-11-14" as LocalDate;
    expect(sum.of(1000, "CLP", date) + sum.of(50, "USD", date)).toBe(1000);
    expect([...sum.missing]).toEqual(["USD"]);
  });

  it("computes the savings rate", () => {
    expect(savingsRate(1000, 750)).toBe(0.25);
    expect(savingsRate(0, 100)).toBeNull();
  });
});
