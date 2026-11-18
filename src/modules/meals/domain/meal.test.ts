import { describe, expect, it } from "vitest";
import type { LocalTime } from "@/shared/domain";
import { isActiveAt, sortBlocks, validateBlock } from "./block";
import { mergeItems, takeFromPantry, validateItems } from "./meal";

const t = (value: string) => value as LocalTime;

describe("blocks", () => {
  it("end after start and at least one category", () => {
    const portions = [{ categoryId: "c1", servings: 1 }];
    expect(validateBlock({ startTime: t("13:00"), endTime: t("14:00"), portions }).ok).toBe(true);
    const crossing = validateBlock({ startTime: t("22:00"), endTime: t("01:00"), portions });
    expect(crossing.ok ? null : crossing.error.field).toBe("endTime");
    expect(validateBlock({ startTime: t("13:00"), endTime: t("13:00"), portions }).ok).toBe(false);
    const empty = validateBlock({ startTime: t("13:00"), endTime: t("14:00"), portions: [] });
    expect(empty.ok ? null : empty.error.field).toBe("portions");
  });

  it("is going on from its start until just before its end", () => {
    const lunch = { startTime: t("13:00"), endTime: t("14:00") };
    expect(isActiveAt(lunch, t("12:59"))).toBe(false);
    expect(isActiveAt(lunch, t("13:00"))).toBe(true);
    expect(isActiveAt(lunch, t("13:59"))).toBe(true);
    expect(isActiveAt(lunch, t("14:00"))).toBe(false);
  });

  it("sorts by time of day", () => {
    const blocks = [
      { name: "Cena", startTime: t("20:00") },
      { name: "Desayuno", startTime: t("08:00") },
      { name: "Almuerzo", startTime: t("13:00") },
    ];
    expect(sortBlocks(blocks).map((b) => b.name)).toEqual(["Desayuno", "Almuerzo", "Cena"]);
  });
});

describe("meal items", () => {
  it("merges the same food", () => {
    expect(
      mergeItems([
        { foodId: "rice", servings: 1 },
        { foodId: "egg", servings: 2 },
        { foodId: "rice", servings: 1 },
      ]),
    ).toEqual([
      { foodId: "rice", servings: 2 },
      { foodId: "egg", servings: 2 },
    ]);
  });

  it("needs at least one item with sensible servings", () => {
    expect(validateItems([]).ok).toBe(false);
    expect(validateItems([{ foodId: "rice", servings: 0 }]).ok).toBe(false);
    expect(validateItems([{ foodId: "rice", servings: 2 }]).ok).toBe(true);
  });

  it("takes the servings out of the pantry, never below zero", () => {
    const foods = new Map([
      ["rice", { unitSize: 80, stock: 1000 }],
      ["egg", { unitSize: 1, stock: 1 }],
    ]);
    expect(
      takeFromPantry(
        [
          { foodId: "rice", servings: 2 },
          { foodId: "egg", servings: 3 },
          { foodId: "unknown", servings: 1 },
        ],
        foods,
      ),
    ).toEqual([
      { foodId: "rice", servings: 2, taken: 160 },
      { foodId: "egg", servings: 3, taken: 1 },
      { foodId: "unknown", servings: 1, taken: 0 },
    ]);
  });
});
