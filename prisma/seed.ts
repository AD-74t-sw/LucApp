/**
 * Demo data for local development: `make seed`.
 *
 * Creates (or reuses) the Supabase Auth user demo@lucapp.local / demo12345 and
 * fills six months of realistic movements through the same use cases the app
 * uses, so every business rule applies. Re-running resets the demo user's data.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { provisionUser } from "@/modules/access";
import { listAccounts } from "@/modules/accounts";
import { createAccount, updateAccount } from "@/modules/accounts/application/manage-accounts";
import { createCard } from "@/modules/accounts/application/manage-cards";
import { listCategories } from "@/modules/categories";
import { createDebt, createPerson, recordPayment } from "@/modules/debts/application/manage-debts";
import { createInstallmentPurchase } from "@/modules/transactions/application/installments";
import { recordExpense, recordIncome } from "@/modules/transactions/application/record-transaction";
import type { FoodIconKey } from "@/modules/meals";
import { createBlock } from "@/modules/meals/application/manage-blocks";
import { createFood, createFoodCategory } from "@/modules/meals/application/manage-catalog";
import { eatMeal, planMeal } from "@/modules/meals/application/manage-meals";
import { addStock } from "@/modules/meals/application/manage-pantry";
import { recordTransfer } from "@/modules/transactions/application/record-transfer";
import {
  type LocalDate,
  type LocalTime,
  addDays,
  addMonths,
  localDate,
  parts,
  today,
} from "@/shared/domain";
import { prisma } from "@/shared/infrastructure";

const EMAIL = "demo@lucapp.local";
const PASSWORD = "demo12345";
const TIMEZONE = "America/Santiago";

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: { message: string } }): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

/** Small deterministic PRNG so the demo looks the same on every run. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

async function findOrCreateAuthUser(): Promise<string> {
  const url = process.env["SUPABASE_URL"];
  const secret = process.env["SUPABASE_SECRET_KEY"];
  if (!url || !secret)
    throw new Error(
      "SUPABASE_URL and SUPABASE_SECRET_KEY are required to seed. Copy the Secret key from `make supabase-status` into .env.",
    );
  const admin = createClient(url, secret, { auth: { persistSession: false } }).auth.admin;

  // Users come in pages; e2e runs leave many sign-ups, so look through all of them.
  for (let page = 1; ; page += 1) {
    const { data: list, error: listError } = await admin.listUsers({ page, perPage: 1000 });
    if (listError) throw listError;
    const existing = list.users.find((u) => u.email === EMAIL);
    if (existing) return existing.id;
    if (list.users.length < 1000) break;
  }

  const { data, error } = await admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: "Lucía Demo", baseCurrency: "CLP", timezone: TIMEZONE },
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  const userId = await findOrCreateAuthUser();

  // Start from a clean slate for this user only.
  await prisma.user.deleteMany({ where: { id: userId } });
  await provisionUser({
    id: userId,
    email: EMAIL,
    metadata: { name: "Lucía Demo", baseCurrency: "CLP", timezone: TIMEZONE },
  });

  const categories = await listCategories(userId);
  const category = (name: string) => {
    const found = categories.find((c) => c.name === name);
    if (!found) throw new Error(`Missing category ${name}`);
    return found.id;
  };

  const checking = unwrap(
    await createAccount(userId, {
      type: "CHECKING",
      currency: "CLP",
      name: "Cuenta corriente",
      institution: "Banco de Chile",
      openingBalance: "850.000",
    }),
  );
  const savings = unwrap(
    await createAccount(userId, {
      type: "SAVINGS",
      currency: "CLP",
      name: "Ahorro",
      institution: "BancoEstado",
      openingBalance: "1.500.000",
    }),
  );
  // Every user gets a cash account on sign-up; give it some money in hand.
  const defaultCash = (await listAccounts(userId)).find((a) => a.type === "CASH")!;
  const cash = unwrap(
    await updateAccount(userId, defaultCash.id, {
      name: defaultCash.name,
      openingBalance: "40.000",
    }),
  );
  const visa = unwrap(
    await createAccount(userId, {
      type: "CREDIT_CARD",
      currency: "CLP",
      name: "Visa Banco de Chile",
      institution: "Banco de Chile",
      creditLimit: "2.000.000",
      international: true,
      secondaryCreditLimit: "2.000",
      closingDay: 25,
      dueDay: 5,
    }),
  );
  const dollars = unwrap(
    await createAccount(userId, {
      type: "DIGITAL_WALLET",
      currency: "USD",
      name: "Wallet USD",
      institution: "Global66",
      openingBalance: "1250",
    }),
  );
  unwrap(
    await createCard(userId, {
      accountId: checking.id,
      name: "Débito",
      network: "MASTERCARD",
      last4: "1188",
    }),
  );
  const visaCard = unwrap(
    await createCard(userId, {
      accountId: visa.id,
      name: "Titular",
      network: "VISA",
      last4: "4242",
    }),
  );

  const now = today(TIMEZONE);

  const rand = random(42);
  const between = (min: number, max: number) => Math.round((min + rand() * (max - min)) / 10) * 10;

  for (let back = 5; back >= 0; back--) {
    const monthStart = addMonths(localDate(parts(now).year, parts(now).month, 1), -back);
    const { year, month } = parts(monthStart);
    const day = (d: number): LocalDate => {
      const date = localDate(year, month, d);
      return date > now ? now : date;
    };
    if (back === 0 && parts(now).day < 2) continue;

    const expense = async (
      account: string,
      categoryName: string,
      amount: number,
      date: LocalDate,
      description: string,
      cardId?: string,
    ) =>
      unwrap(
        await recordExpense(userId, {
          accountId: account,
          categoryId: category(categoryName),
          amount: String(amount),
          date,
          description,
          ...(cardId ? { cardId } : {}),
        }),
      );

    unwrap(
      await recordIncome(userId, {
        accountId: checking.id,
        categoryId: category("Sueldo"),
        amount: "1.850.000",
        date: day(1),
        description: "Sueldo",
      }),
    );
    await expense(checking.id, "Arriendo o dividendo", 520000, day(2), "Arriendo");
    await expense(checking.id, "Gastos comunes", between(68000, 75000), day(5), "Gastos comunes");
    await expense(checking.id, "Luz", between(28000, 42000), day(8), "Cuenta de luz");
    await expense(checking.id, "Internet y teléfono", 32990, day(10), "Internet hogar");
    await expense(visa.id, "Suscripciones", 9990, day(12), "Streaming", visaCard.id);
    for (const d of [3, 10, 17, 24]) {
      await expense(
        visa.id,
        "Supermercado",
        between(35000, 78000),
        day(d),
        "Supermercado",
        visaCard.id,
      );
    }
    await expense(visa.id, "Restaurantes", between(18000, 45000), day(14), "Cena", visaCard.id);
    await expense(visa.id, "Delivery", between(9000, 19000), day(20), "Delivery", visaCard.id);
    await expense(checking.id, "Combustible", between(40000, 60000), day(9), "Bencina");
    await expense(
      cash.id,
      "Transporte público",
      between(12000, 20000),
      day(6),
      "Carga tarjeta bip",
    );
    if (back % 2 === 0)
      await expense(visa.id, "Ropa", between(25000, 60000), day(18), "Ropa", visaCard.id);
    if (back === 3) await expense(dollars.id, "Viajes", 180, day(15), "Hotel en viaje"); // USD 180

    // International purchases on the Visa, in dollars.
    const usdExpense = async (
      categoryName: string,
      amount: string,
      d: number,
      description: string,
    ) =>
      unwrap(
        await recordExpense(userId, {
          accountId: visa.id,
          cardId: visaCard.id,
          currency: "USD",
          categoryId: category(categoryName),
          amount,
          date: day(d),
          description,
        }),
      );
    await usdExpense("Suscripciones", "20", 7, "Software (USD)");
    if (back === 2) await usdExpense("Tecnología", "145,50", 11, "Compra online (USD)");

    unwrap(
      await recordTransfer(userId, {
        fromAccountId: checking.id,
        toAccountId: cash.id,
        amount: "20.000",
        date: day(4),
        description: "Giro cajero",
      }),
    );

    if (localDate(year, month, 27) <= now) {
      unwrap(
        await recordTransfer(userId, {
          fromAccountId: checking.id,
          toAccountId: visa.id,
          amount: "320.000",
          date: day(26),
          description: "Pago tarjeta",
        }),
      );
      // Pay the month's dollar debt from the peso account: what the bank charged.
      unwrap(
        await recordTransfer(userId, {
          fromAccountId: checking.id,
          toAccountId: visa.id,
          toCurrency: "USD",
          toAmount: back === 2 ? "165,50" : "20",
          ...(back === 2 ? { rate: "975,20" } : { amount: "19.400" }),
          date: day(26),
          description: "Pago deuda internacional",
        }),
      );
      unwrap(
        await recordTransfer(userId, {
          fromAccountId: checking.id,
          toAccountId: savings.id,
          amount: "150.000",
          date: day(27),
          description: "Ahorro mensual",
        }),
      );
    }
  }

  unwrap(
    await createInstallmentPurchase(userId, {
      accountId: visa.id,
      cardId: visaCard.id,
      categoryId: category("Tecnología"),
      totalAmount: "899.990",
      installmentCount: 12,
      firstChargeDate: addMonths(now, -3),
      description: "Notebook",
    }),
  );
  unwrap(
    await createInstallmentPurchase(userId, {
      accountId: visa.id,
      cardId: visaCard.id,
      categoryId: category("Hogar"),
      totalAmount: "240.000",
      installmentCount: 6,
      firstChargeDate: addMonths(now, -1),
      description: "Refrigerador",
    }),
  );

  const martin = unwrap(await createPerson(userId, { name: "Martín", note: "Amigo de la U" }));
  const carla = unwrap(await createPerson(userId, { name: "Carla" }));
  unwrap(
    await createDebt(userId, {
      personId: martin.id,
      direction: "THEY_OWE",
      amount: "45.000",
      currency: "CLP",
      date: addMonths(now, -1),
      description: "Entradas concierto",
      categoryId: category("Salidas"),
    }),
  );
  // Martín paid my lunch: pending debt; what I pay back counts as spending in "Restaurantes".
  const lunch = unwrap(
    await createDebt(userId, {
      personId: martin.id,
      direction: "I_OWE",
      amount: "12.500",
      currency: "CLP",
      date: now,
      description: "Almuerzo que pagó Martín",
      categoryId: category("Restaurantes"),
    }),
  );
  unwrap(
    await recordPayment(userId, lunch.debtId, {
      amount: "5.000",
      date: now,
      accountId: checking.id,
      note: "Parte del almuerzo",
    }),
  );
  const { debtId } = unwrap(
    await createDebt(userId, {
      personId: carla.id,
      direction: "I_OWE",
      amount: "120.000",
      currency: "CLP",
      date: addMonths(now, -2),
      dueDate: addMonths(now, 1),
      description: "Préstamo para el auto",
      categoryId: category("Combustible"),
      accountId: checking.id,
    }),
  );
  unwrap(
    await recordPayment(userId, debtId, {
      amount: "40.000",
      date: addMonths(now, -1),
      accountId: checking.id,
      note: "Primer abono",
    }),
  );

  await seedMeals(userId, now);

  console.log(`Demo data ready. Sign in at http://localhost:3100 with ${EMAIL} / ${PASSWORD}`);
}

/**
 * Meals app: a small catalog with icons, the four blocks of a Chilean day,
 * what is at home (short on protein, so the pantry warning shows), yesterday
 * eaten and tomorrow's lunch already planned.
 */
async function seedMeals(userId: string, now: LocalDate) {
  const categories = new Map<string, string>();
  for (const name of ["Proteínas", "Carbohidratos", "Verduras", "Frutas", "Lácteos"]) {
    categories.set(name, unwrap(await createFoodCategory(userId, { name })).id);
  }
  const cat = (name: string) => categories.get(name) ?? "";
  const foods = new Map<string, string>();
  const food = async (
    name: string,
    category: string,
    icon: FoodIconKey,
    unitAmount: string,
    unit: "g" | "kg" | "ml" | "l" | "pieces",
    stock?: { amount: string; unit: "g" | "kg" | "ml" | "l" | "pieces" | "servings" },
  ) => {
    const { id } = unwrap(
      await createFood(userId, {
        name,
        categoryId: cat(category),
        icon,
        unitAmount,
        unit,
      }),
    );
    if (stock) unwrap(await addStock(userId, { foodId: id, ...stock }));
    foods.set(name, id);
  };
  await food("Pechuga de pollo", "Proteínas", "drumstick", "150", "g", {
    amount: "450",
    unit: "g",
  });
  await food("Huevo", "Proteínas", "egg", "2", "pieces", { amount: "6", unit: "pieces" });
  await food("Atún", "Proteínas", "can", "120", "g");
  await food("Arroz", "Carbohidratos", "bowl", "80", "g", { amount: "2", unit: "kg" });
  await food("Pan", "Carbohidratos", "sandwich", "1", "pieces", { amount: "10", unit: "pieces" });
  await food("Avena", "Carbohidratos", "wheat", "40", "g", { amount: "800", unit: "g" });
  await food("Lechuga", "Verduras", "leafy-green", "100", "g", { amount: "300", unit: "g" });
  await food("Zanahoria", "Verduras", "carrot", "100", "g", { amount: "1", unit: "kg" });
  await food("Plátano", "Frutas", "banana", "1", "pieces", { amount: "5", unit: "pieces" });
  await food("Manzana", "Frutas", "apple", "1", "pieces", { amount: "4", unit: "pieces" });
  await food("Palta", "Frutas", "avocado", "50", "g", { amount: "500", unit: "g" });
  await food("Leche", "Lácteos", "milk", "200", "ml", { amount: "2", unit: "l" });
  await food("Yogur", "Lácteos", "jar", "1", "pieces", { amount: "4", unit: "pieces" });
  const f = (name: string) => foods.get(name) ?? "";

  const block = async (
    name: string,
    startTime: string,
    endTime: string,
    portions: [string, number][],
  ) =>
    unwrap(
      await createBlock(userId, {
        name,
        startTime: startTime as LocalTime,
        endTime: endTime as LocalTime,
        notify: true,
        portions: portions.map(([category, servings]) => ({ categoryId: cat(category), servings })),
      }),
    ).id;
  const breakfast = await block("Desayuno", "07:30", "09:00", [
    ["Carbohidratos", 1],
    ["Lácteos", 1],
    ["Frutas", 1],
  ]);
  const lunch = await block("Almuerzo", "13:00", "14:30", [
    ["Proteínas", 1],
    ["Carbohidratos", 1],
    ["Verduras", 1],
  ]);
  await block("Once", "17:30", "18:30", [
    ["Carbohidratos", 1],
    ["Lácteos", 1],
  ]);
  const dinner = await block("Cena", "20:30", "21:30", [
    ["Proteínas", 1],
    ["Verduras", 1],
  ]);

  const yesterday = addDays(now, -1);
  unwrap(
    await eatMeal(
      userId,
      { blockId: breakfast, date: yesterday },
      [
        { foodId: f("Avena"), servings: 1 },
        { foodId: f("Leche"), servings: 1 },
        { foodId: f("Plátano"), servings: 1 },
      ],
      now,
    ),
  );
  unwrap(
    await eatMeal(
      userId,
      { blockId: lunch, date: yesterday },
      [
        { foodId: f("Pechuga de pollo"), servings: 1 },
        { foodId: f("Arroz"), servings: 1 },
        { foodId: f("Lechuga"), servings: 1 },
      ],
      now,
    ),
  );
  unwrap(
    await planMeal(userId, { blockId: dinner, date: now }, [
      { foodId: f("Huevo"), servings: 1 },
      { foodId: f("Zanahoria"), servings: 1 },
    ]),
  );
  // Tomorrow's lunch is already cooked.
  unwrap(
    await planMeal(userId, { blockId: lunch, date: addDays(now, 1) }, [
      { foodId: f("Pechuga de pollo"), servings: 1 },
      { foodId: f("Arroz"), servings: 1 },
      { foodId: f("Zanahoria"), servings: 1 },
    ]),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
