import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { getDay, getPantry, getShortages, listFoods, runMealNotifications } from "@/modules/meals";
import { createBlock, deleteBlock, updateBlock } from "@/modules/meals/application/manage-blocks";
import {
  createFood,
  createFoodCategory,
  deleteFood,
  deleteFoodCategory,
  updateFood,
} from "@/modules/meals/application/manage-catalog";
import { clearPlan, eatMeal, planMeal, undoMeal } from "@/modules/meals/application/manage-meals";
import { addStock, setStock } from "@/modules/meals/application/manage-pantry";
import { saveMealSettings } from "@/modules/meals/application/manage-settings";
import { countDevices } from "@/modules/notifications";
import { subscribe } from "@/modules/notifications/application/manage-subscriptions";
import { type LocalDate, type LocalTime, addDays } from "@/shared/domain";
import { prisma } from "@/shared/infrastructure";
import { sentPushes } from "../setup-push";
import { TODAY, createUser, unwrap } from "./helpers";

afterAll(() => prisma.$disconnect());

const t = (value: string) => value as LocalTime;

/** A user with two categories, three foods and a lunch block (1 protein + 1 carbs). */
async function kitchen() {
  const userId = await createUser();
  const protein = unwrap(await createFoodCategory(userId, { name: "Proteínas" }));
  const carbs = unwrap(await createFoodCategory(userId, { name: "Carbohidratos" }));
  const chicken = unwrap(
    await createFood(userId, {
      name: "Pollo",
      categoryId: protein.id,
      icon: "drumstick",
      unitAmount: "150",
      unit: "g",
    }),
  );
  const rice = unwrap(
    await createFood(userId, { name: "Arroz", categoryId: carbs.id, unitAmount: "80", unit: "g" }),
  );
  const egg = unwrap(
    await createFood(userId, {
      name: "Huevo",
      categoryId: protein.id,
      icon: "egg",
      unitAmount: "1",
      unit: "pieces",
    }),
  );
  const lunch = unwrap(
    await createBlock(userId, {
      name: "Almuerzo",
      startTime: t("13:00"),
      endTime: t("14:00"),
      notify: true,
      portions: [
        { categoryId: protein.id, servings: 1 },
        { categoryId: carbs.id, servings: 1 },
      ],
    }),
  );
  return { userId, protein, carbs, chicken, rice, egg, lunch };
}

async function stockOf(userId: string, foodId: string) {
  return (await listFoods(userId)).find((f) => f.id === foodId)?.stock;
}

describe("catalog and pantry", () => {
  it("stores servings and stock in the base measure", async () => {
    const { userId, chicken, rice, egg } = await kitchen();
    unwrap(await addStock(userId, { foodId: chicken.id, amount: "600", unit: "g" }));
    unwrap(await addStock(userId, { foodId: rice.id, amount: "1,5", unit: "kg" }));
    unwrap(await addStock(userId, { foodId: egg.id, amount: "6", unit: "servings" }));
    unwrap(await addStock(userId, { foodId: egg.id, amount: "2", unit: "pieces" }));
    expect(await stockOf(userId, chicken.id)).toBe(600);
    expect(await stockOf(userId, rice.id)).toBe(1500);
    expect(await stockOf(userId, egg.id)).toBe(8);

    // Liters do not fit a food weighed in grams.
    expect((await addStock(userId, { foodId: rice.id, amount: "1", unit: "l" })).ok).toBe(false);

    unwrap(await setStock(userId, rice.id, { amount: "0", unit: "g" }));
    expect(await stockOf(userId, rice.id)).toBe(0);
  });

  it("rejects duplicate names and empties stock when the measure changes", async () => {
    const { userId, protein, chicken } = await kitchen();
    expect((await createFoodCategory(userId, { name: "proteínas" })).ok).toBe(false);
    const duplicate = await createFood(userId, {
      name: "pollo",
      categoryId: protein.id,
      unitAmount: "100",
      unit: "g",
    });
    expect(duplicate.ok ? null : duplicate.error.field).toBe("name");

    unwrap(await addStock(userId, { foodId: chicken.id, amount: "300", unit: "g" }));
    unwrap(
      await updateFood(userId, chicken.id, {
        name: "Pollo",
        categoryId: protein.id,
        icon: "drumstick",
        unitAmount: "160",
        unit: "g",
      }),
    );
    expect(await stockOf(userId, chicken.id)).toBe(300);
    unwrap(
      await updateFood(userId, chicken.id, {
        name: "Pollo",
        categoryId: protein.id,
        unitAmount: "1",
        unit: "pieces",
      }),
    );
    expect(await stockOf(userId, chicken.id)).toBe(0);
  });

  it("validates blocks", async () => {
    const { userId, protein, lunch } = await kitchen();
    const crossing = await createBlock(userId, {
      name: "Trasnoche",
      startTime: t("23:00"),
      endTime: t("01:00"),
      notify: false,
      portions: [{ categoryId: protein.id, servings: 1 }],
    });
    expect(crossing.ok ? null : crossing.error.field).toBe("endTime");
    const foreign = await updateBlock(userId, lunch.id, {
      name: "Almuerzo",
      startTime: t("13:00"),
      endTime: t("14:00"),
      notify: true,
      portions: [{ categoryId: randomUUID(), servings: 1 }],
    });
    expect(foreign.ok).toBe(false);
  });

  it("warns when the pantry does not cover the next days", async () => {
    const { userId, chicken, rice } = await kitchen();
    unwrap(await saveMealSettings(userId, { coverageDays: 3, shortageAlertTime: t("10:00") }));
    unwrap(await addStock(userId, { foodId: chicken.id, amount: "1", unit: "servings" }));
    unwrap(await addStock(userId, { foodId: rice.id, amount: "1", unit: "kg" }));
    const pantry = await getPantry(userId);
    const protein = pantry.coverage.find((c) => c.categoryId === chicken.categoryId);
    expect(protein).toMatchObject({ available: 1, perDay: 1, needed: 3, missing: 2 });
    expect((await getShortages(userId)).map((c) => c.categoryId)).toEqual([chicken.categoryId]);
  });
});

describe("meals of the day", () => {
  it("plans ahead, eats the plan, undoes it", async () => {
    const { userId, chicken, rice, lunch } = await kitchen();
    unwrap(await addStock(userId, { foodId: chicken.id, amount: "600", unit: "g" }));
    unwrap(await addStock(userId, { foodId: rice.id, amount: "1", unit: "kg" }));
    const today = { blockId: lunch.id, date: TODAY };
    const tomorrow = { blockId: lunch.id, date: addDays(TODAY, 1) };
    const plan = [
      { foodId: chicken.id, servings: 1 },
      { foodId: rice.id, servings: 1 },
    ];

    // Tomorrow's lunch is already cooked: planned, but it cannot be eaten yet.
    unwrap(await planMeal(userId, tomorrow, plan));
    expect((await eatMeal(userId, tomorrow, undefined, TODAY)).ok).toBe(false);
    expect(await stockOf(userId, chicken.id)).toBe(600);

    // Nothing planned today: eating asks what was eaten.
    const unplanned = await eatMeal(userId, today, undefined, TODAY);
    expect(unplanned.ok ? null : unplanned.error.field).toBe("items");

    unwrap(await planMeal(userId, today, plan));
    unwrap(await eatMeal(userId, today, undefined, TODAY));
    expect(await stockOf(userId, chicken.id)).toBe(450);
    expect(await stockOf(userId, rice.id)).toBe(920);
    const day = await getDay(userId, TODAY);
    expect(day.meals[0]).toMatchObject({ status: "EATEN", blockId: lunch.id });
    expect((await eatMeal(userId, today, undefined, TODAY)).ok).toBe(false);
    expect((await planMeal(userId, today, plan)).ok).toBe(false);

    unwrap(await undoMeal(userId, today));
    expect(await stockOf(userId, chicken.id)).toBe(600);
    expect(await stockOf(userId, rice.id)).toBe(1000);
    expect((await getDay(userId, TODAY)).meals[0]?.status).toBe("PLANNED");

    unwrap(await clearPlan(userId, today));
    expect((await getDay(userId, TODAY)).meals).toEqual([]);
  });

  it("eats something else, never taking more than there is", async () => {
    const { userId, chicken, egg, lunch } = await kitchen();
    unwrap(await addStock(userId, { foodId: egg.id, amount: "2", unit: "pieces" }));
    const target = { blockId: lunch.id, date: TODAY };
    unwrap(await planMeal(userId, target, [{ foodId: chicken.id, servings: 1 }]));

    // "Comí otra cosa": three eggs instead of the planned chicken, with two at home.
    unwrap(await eatMeal(userId, target, [{ foodId: egg.id, servings: 3 }], TODAY));
    expect(await stockOf(userId, egg.id)).toBe(0);
    const meal = (await getDay(userId, TODAY)).meals[0];
    expect(meal?.items).toEqual([{ foodId: egg.id, servings: 3, taken: 2 }]);

    // Undoing gives back the two eggs that were taken, not three.
    unwrap(await undoMeal(userId, target));
    expect(await stockOf(userId, egg.id)).toBe(2);
  });

  it("keeps history: foods, categories and blocks in use are archived, not deleted", async () => {
    const { userId, protein, chicken, lunch } = await kitchen();
    unwrap(
      await eatMeal(
        userId,
        { blockId: lunch.id, date: TODAY },
        [{ foodId: chicken.id, servings: 1 }],
        TODAY,
      ),
    );
    expect((await deleteFood(userId, chicken.id)).ok).toBe(false);
    expect((await deleteFoodCategory(userId, protein.id)).ok).toBe(false);
    expect((await deleteBlock(userId, lunch.id)).ok).toBe(false);
  });
});

describe("notifications", () => {
  // 2026-07-01 17:30 UTC is 13:30 in Santiago (UTC-4 in July): lunch is going on.
  const LUNCHTIME = new Date("2026-07-01T17:30:00Z");
  const DATE = "2026-07-01" as LocalDate;

  it("reminds about a block once, and warns about the pantry once a day", async () => {
    const { userId, lunch } = await kitchen();
    const endpoint = `https://push.example/${randomUUID()}`;
    unwrap(await subscribe(userId, { endpoint, keys: { p256dh: "key", auth: "auth" } }, null));
    const mine = () => sentPushes.filter((p) => p.target.endpoint === endpoint);

    await runMealNotifications(LUNCHTIME);
    expect(mine().map((p) => p.payload.title)).toEqual([
      "Almuerzo · 13:00–14:00",
      "Falta comida en casa",
    ]);
    expect(mine()[0]?.payload.url).toBe(`/meals?date=${DATE}`);

    // A second run (or a second server) sends nothing new.
    await runMealNotifications(LUNCHTIME);
    expect(mine()).toHaveLength(2);

    // Before the block starts nothing is due for it.
    await runMealNotifications(new Date("2026-07-02T16:59:00Z"));
    expect(mine().filter((p) => p.payload.tag === `meal-${lunch.id}`)).toHaveLength(1);
  });

  it("does not remind about a block already eaten, and forgets revoked devices", async () => {
    const { userId, chicken, lunch } = await kitchen();
    unwrap(
      await eatMeal(
        userId,
        { blockId: lunch.id, date: DATE },
        [{ foodId: chicken.id, servings: 1 }],
        TODAY,
      ),
    );
    const endpoint = `https://push.example/gone-${randomUUID()}`;
    unwrap(await subscribe(userId, { endpoint, keys: { p256dh: "key", auth: "auth" } }, null));
    expect(await countDevices(userId)).toBe(1);

    await runMealNotifications(LUNCHTIME);
    expect(sentPushes.filter((p) => p.target.endpoint === endpoint)).toEqual([]);
    // The pantry alert tried the revoked device, which is now forgotten.
    expect(await countDevices(userId)).toBe(0);
  });
});
