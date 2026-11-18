import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getAccount, listAccounts } from "@/modules/accounts";
import { deleteAccount, updateAccount } from "@/modules/accounts/application/manage-accounts";
import { getCategory } from "@/modules/categories";
import { deleteCategory, updateCategory } from "@/modules/categories/application/manage-categories";
import { getAccountBalances, getTransaction, listTransactions } from "@/modules/transactions";
import {
  deleteTransaction,
  recordExpense,
} from "@/modules/transactions/application/record-transaction";
import { recordTransfer } from "@/modules/transactions/application/record-transfer";
import { getDay, getPantry, listBlocks, listFoods } from "@/modules/meals";
import { createBlock, deleteBlock, updateBlock } from "@/modules/meals/application/manage-blocks";
import {
  createFood,
  createFoodCategory,
  deleteFood,
  renameFoodCategory,
} from "@/modules/meals/application/manage-catalog";
import { eatMeal, planMeal, undoMeal } from "@/modules/meals/application/manage-meals";
import { addStock, setStock } from "@/modules/meals/application/manage-pantry";
import { countDevices } from "@/modules/notifications";
import { subscribe, unsubscribe } from "@/modules/notifications/application/manage-subscriptions";
import type { LocalTime } from "@/shared/domain";
import { prisma } from "@/shared/infrastructure";
import { TODAY, categoryId, createChecking, createUser, unwrap } from "./helpers";

/**
 * Every query is scoped by the user id that comes from the session. These tests
 * try to reach user A's data with user B's id and must always fail.
 */
let alice: string;
let bob: string;
let aliceAccountId: string;
let aliceTransactionId: string;
let aliceCategoryId: string;

beforeAll(async () => {
  alice = await createUser();
  bob = await createUser();
  aliceAccountId = (await createChecking(alice)).id;
  aliceCategoryId = await categoryId(alice, "Supermercado");
  aliceTransactionId = unwrap(
    await recordExpense(alice, {
      accountId: aliceAccountId,
      categoryId: aliceCategoryId,
      amount: "1000",
      date: TODAY,
      description: "Privado",
    }),
  ).id;
});

afterAll(() => prisma.$disconnect());

describe("user isolation", () => {
  it("does not read another user's data", async () => {
    expect(await getAccount(bob, aliceAccountId)).toBeNull();
    expect(await getTransaction(bob, aliceTransactionId)).toBeNull();
    expect(await getCategory(bob, aliceCategoryId)).toBeNull();
    // Bob only sees his own default cash account.
    expect((await listAccounts(bob)).map((a) => a.type)).toEqual(["CASH"]);
    expect((await listTransactions(bob, { page: 1 }, TODAY)).total).toBe(0);
    expect((await getAccountBalances(bob, TODAY)).has(aliceAccountId)).toBe(false);
  });

  it("does not write into another user's accounts or categories", async () => {
    const bobCategory = await categoryId(bob, "Supermercado");
    const result = await recordExpense(bob, {
      accountId: aliceAccountId,
      categoryId: bobCategory,
      amount: "1",
      date: TODAY,
      description: "Intruso",
    });
    expect(result.ok).toBe(false);

    const bobAccount = await createChecking(bob);
    const withAliceCategory = await recordExpense(bob, {
      accountId: bobAccount.id,
      categoryId: aliceCategoryId,
      amount: "1",
      date: TODAY,
      description: "Intruso",
    });
    expect(withAliceCategory.ok).toBe(false);

    const transfer = await recordTransfer(bob, {
      fromAccountId: bobAccount.id,
      toAccountId: aliceAccountId,
      amount: "1",
      date: TODAY,
    });
    expect(transfer.ok).toBe(false);
  });

  it("does not modify or delete another user's records", async () => {
    expect((await updateAccount(bob, aliceAccountId, { name: "Hackeada" })).ok).toBe(false);
    expect((await deleteAccount(bob, aliceAccountId)).ok).toBe(false);
    expect((await deleteTransaction(bob, aliceTransactionId)).ok).toBe(false);
    expect((await updateCategory(bob, aliceCategoryId, { name: "X", color: "#000000" })).ok).toBe(
      false,
    );
    expect((await deleteCategory(bob, aliceCategoryId)).ok).toBe(false);

    expect((await getAccount(alice, aliceAccountId))?.name).not.toBe("Hackeada");
    expect(await getTransaction(alice, aliceTransactionId)).not.toBeNull();
  });

  it("keeps meals, pantry and notification devices private", async () => {
    const category = unwrap(await createFoodCategory(alice, { name: "Proteínas" }));
    const food = unwrap(
      await createFood(alice, {
        name: "Pollo",
        categoryId: category.id,
        unitAmount: "150",
        unit: "g",
      }),
    );
    unwrap(await addStock(alice, { foodId: food.id, amount: "600", unit: "g" }));
    const block = unwrap(
      await createBlock(alice, {
        name: "Almuerzo",
        startTime: "13:00" as LocalTime,
        endTime: "14:00" as LocalTime,
        notify: true,
        portions: [{ categoryId: category.id, servings: 1 }],
      }),
    );
    const target = { blockId: block.id, date: TODAY };

    // Bob sees none of it.
    expect(await listFoods(bob)).toEqual([]);
    expect(await listBlocks(bob)).toEqual([]);
    expect((await getPantry(bob)).categories).toEqual([]);
    expect((await getDay(bob, TODAY)).meals).toEqual([]);

    // Nor can he change it, use it or eat from Alice's pantry.
    expect((await renameFoodCategory(bob, category.id, { name: "X" })).ok).toBe(false);
    expect((await deleteFood(bob, food.id)).ok).toBe(false);
    expect((await addStock(bob, { foodId: food.id, amount: "1", unit: "kg" })).ok).toBe(false);
    expect((await setStock(bob, food.id, { amount: "0", unit: "g" })).ok).toBe(false);
    expect((await deleteBlock(bob, block.id)).ok).toBe(false);
    const bobCategory = unwrap(await createFoodCategory(bob, { name: "Proteínas" }));
    expect(
      (
        await updateBlock(bob, block.id, {
          name: "X",
          startTime: "08:00" as LocalTime,
          endTime: "09:00" as LocalTime,
          notify: false,
          portions: [{ categoryId: bobCategory.id, servings: 1 }],
        })
      ).ok,
    ).toBe(false);
    expect(
      (
        await createBlock(bob, {
          name: "Intruso",
          startTime: "08:00" as LocalTime,
          endTime: "09:00" as LocalTime,
          notify: false,
          portions: [{ categoryId: category.id, servings: 1 }],
        })
      ).ok,
    ).toBe(false);
    expect((await planMeal(bob, target, [{ foodId: food.id, servings: 1 }])).ok).toBe(false);
    expect((await eatMeal(bob, target, [{ foodId: food.id, servings: 1 }], TODAY)).ok).toBe(false);
    unwrap(await planMeal(alice, target, [{ foodId: food.id, servings: 1 }]));
    expect((await eatMeal(bob, target, undefined, TODAY)).ok).toBe(false);
    expect((await undoMeal(bob, target)).ok).toBe(false);
    expect((await listFoods(alice))[0]?.stock).toBe(600);

    // A device subscription is removed only by its owner.
    const endpoint = "https://push.example/alice-phone";
    unwrap(await subscribe(alice, { endpoint, keys: { p256dh: "k", auth: "a" } }, null));
    unwrap(await unsubscribe(bob, endpoint));
    expect(await countDevices(alice)).toBe(1);
    expect(await countDevices(bob)).toBe(0);
    unwrap(await unsubscribe(alice, endpoint));
  });
});
