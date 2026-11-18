import { randomUUID } from "node:crypto";
import { provisionUser } from "@/modules/access";
import { createAccount } from "@/modules/accounts/application/manage-accounts";
import { listCategories } from "@/modules/categories";
import { type LocalDate, addMonths, today } from "@/shared/domain";

/** A provisioned user (profile, settings, default categories), as after signing up. */
export async function createUser(): Promise<string> {
  const id = randomUUID();
  await provisionUser({
    id,
    email: `${id}@test.local`,
    metadata: { name: "Persona de prueba", baseCurrency: "CLP", timezone: "America/Santiago" },
  });
  return id;
}

export function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!result.ok) throw new Error(`Expected success, got ${JSON.stringify(result.error)}`);
  return result.value;
}

export async function categoryId(userId: string, name: string): Promise<string> {
  const category = (await listCategories(userId)).find((c) => c.name === name);
  if (!category) throw new Error(`Category ${name} not found`);
  return category.id;
}

export async function createChecking(userId: string, openingBalance = "100000") {
  return unwrap(
    await createAccount(userId, {
      type: "CHECKING",
      currency: "CLP",
      name: `Cuenta ${randomUUID().slice(0, 6)}`,
      openingBalance,
    }),
  );
}

export async function createCreditCard(userId: string) {
  return unwrap(
    await createAccount(userId, {
      type: "CREDIT_CARD",
      currency: "CLP",
      name: `Visa ${randomUUID().slice(0, 6)}`,
      creditLimit: "1000000",
      closingDay: 25,
      dueDay: 5,
    }),
  );
}

export const TODAY: LocalDate = today("America/Santiago");
export const NEXT_MONTH: LocalDate = addMonths(TODAY, 1);
