import { afterAll, describe, expect, it } from "vitest";
import { provisionUser } from "@/modules/access";
import { listAccounts } from "@/modules/accounts";
import {
  createAccount,
  deleteAccount,
  setAccountArchived,
} from "@/modules/accounts/application/manage-accounts";
import { prisma } from "@/shared/infrastructure";
import { createUser, unwrap } from "./helpers";

afterAll(() => prisma.$disconnect());

describe("default cash account", () => {
  it("is created on sign-up, only once", async () => {
    const userId = await createUser();
    const cash = (await listAccounts(userId)).filter((a) => a.type === "CASH");
    expect(cash).toHaveLength(1);
    expect(cash[0]).toMatchObject({ name: "Efectivo", currency: "CLP" });

    await provisionUser({ id: userId, email: `${userId}@test.local`, metadata: {} });
    expect((await listAccounts(userId)).filter((a) => a.type === "CASH")).toHaveLength(1);
  });

  it("cannot be archived or deleted while it is the only cash account", async () => {
    const userId = await createUser();
    const cash = (await listAccounts(userId)).find((a) => a.type === "CASH")!;
    expect((await setAccountArchived(userId, cash.id, true)).ok).toBe(false);
    expect((await deleteAccount(userId, cash.id)).ok).toBe(false);

    // With a second cash account, the first one can go.
    unwrap(await createAccount(userId, { type: "CASH", currency: "USD", name: "Dólares en mano" }));
    expect((await deleteAccount(userId, cash.id)).ok).toBe(true);
  });
});
