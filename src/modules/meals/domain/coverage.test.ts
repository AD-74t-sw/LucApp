import { describe, expect, it } from "vitest";
import type { LocalDate, LocalTime } from "@/shared/domain";
import type { MealBlock } from "./block";
import { coverage, shortages } from "./coverage";
import type { Food, FoodCategory } from "./food";
import type { Meal } from "./meal";
import { dueMealReminders, isShortageAlertDue, mealReminderKey } from "./reminders";

const t = (value: string) => value as LocalTime;
const DATE = "2026-11-18" as LocalDate;

const protein: FoodCategory = { id: "protein", name: "Proteínas", archived: false };
const carbs: FoodCategory = { id: "carbs", name: "Carbohidratos", archived: false };
const fruit: FoodCategory = { id: "fruit", name: "Frutas", archived: false };

function food(overrides: Partial<Food>): Food {
  return {
    id: "f",
    categoryId: "protein",
    name: "Pollo",
    icon: null,
    measure: "MASS",
    unitSize: 150,
    stock: 0,
    archived: false,
    ...overrides,
  };
}

function block(overrides: Partial<MealBlock>): MealBlock {
  return {
    id: "lunch",
    name: "Almuerzo",
    startTime: t("13:00"),
    endTime: t("14:00"),
    notify: true,
    archived: false,
    portions: [],
    ...overrides,
  };
}

describe("coverage", () => {
  const blocks = [
    block({
      id: "lunch",
      portions: [
        { categoryId: "protein", servings: 1 },
        { categoryId: "carbs", servings: 1 },
      ],
    }),
    block({ id: "dinner", portions: [{ categoryId: "protein", servings: 1 }] }),
    block({ id: "old", archived: true, portions: [{ categoryId: "carbs", servings: 5 }] }),
  ];
  const foods = [
    food({ id: "chicken", stock: 600 }), // 4 servings
    food({ id: "eggs", measure: "COUNT", unitSize: 2, stock: 3 }), // 1 serving
    food({ id: "rice", categoryId: "carbs", unitSize: 80, stock: 1000 }), // 12 servings
    food({ id: "gone", categoryId: "carbs", stock: 9000, archived: true }),
  ];

  it("compares whole servings at home with what the blocks ask for", () => {
    const result = coverage([protein, carbs, fruit], foods, blocks, 3);
    expect(result).toEqual([
      { categoryId: "protein", available: 5, perDay: 2, needed: 6, missing: 1 },
      { categoryId: "carbs", available: 12, perDay: 1, needed: 3, missing: 0 },
      // No block asks for fruit: never missing.
      { categoryId: "fruit", available: 0, perDay: 0, needed: 0, missing: 0 },
    ]);
    expect(shortages(result).map((c) => c.categoryId)).toEqual(["protein"]);
  });

  it("skips archived categories", () => {
    expect(coverage([{ ...protein, archived: true }], foods, blocks, 3)).toEqual([]);
  });
});

describe("reminders", () => {
  const lunch = block({ id: "lunch" });
  const dinner = block({ id: "dinner", startTime: t("20:00"), endTime: t("21:00") });
  const quiet = block({ id: "quiet", notify: false });
  const meal = (status: Meal["status"]): Meal => ({
    id: "m",
    blockId: "lunch",
    date: DATE,
    status,
    eatenAt: null,
    items: [],
  });
  const due = (overrides: Partial<Parameters<typeof dueMealReminders>[0]> = {}) =>
    dueMealReminders({
      blocks: [lunch, dinner, quiet],
      meals: [],
      date: DATE,
      time: t("13:20"),
      sentKeys: new Set(),
      ...overrides,
    }).map((b) => b.id);

  it("reminds about blocks going on that notify", () => {
    expect(due()).toEqual(["lunch"]);
    expect(due({ time: t("12:59") })).toEqual([]);
    expect(due({ time: t("20:00") })).toEqual(["dinner"]);
  });

  it("does not remind twice, nor about what was already eaten", () => {
    expect(due({ sentKeys: new Set([mealReminderKey("lunch", DATE)]) })).toEqual([]);
    expect(due({ meals: [meal("EATEN")] })).toEqual([]);
    // Planned (not eaten) still reminds: it is time to eat it.
    expect(due({ meals: [meal("PLANNED")] })).toEqual(["lunch"]);
  });

  it("sends the shortage alert from the chosen time", () => {
    expect(isShortageAlertDue(t("09:59"), t("10:00"))).toBe(false);
    expect(isShortageAlertDue(t("10:00"), t("10:00"))).toBe(true);
  });
});
