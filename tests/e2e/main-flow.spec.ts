import { expect, test } from "@playwright/test";
import { button, dialog, field, open, shot } from "./helpers";

/**
 * Main journey: sign up -> accounts -> expense -> installments -> debt -> dashboard.
 * Each project (desktop / mobile) registers its own user.
 */

test("a new user tracks money end to end", async ({ page }) => {
  const email = `e2e-${Date.now()}-${test.info().project.name}@lucapp.test`;

  // Sign up (local Supabase does not require email confirmation).
  await open(page, "/register");
  await field(page, "Nombre").fill("Lucía Prueba");
  await field(page, "Correo").fill(email);
  await field(page, "Contraseña").fill("una-clave-segura");
  await button(page, "Crear cuenta").click();
  // Signing up provisions the account; the first one compiles the dashboard in dev mode.
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await shot(page, "01-empty-dashboard");

  // Checking account with an opening balance, from the "Nueva cuenta" dialog.
  await open(page, "/accounts");
  await expect(page.getByRole("heading", { name: "Efectivo" })).toBeVisible();
  await page.getByRole("link", { name: "Nueva cuenta" }).filter({ visible: true }).click();
  const newAccount = await dialog(page, "Nueva cuenta");
  await field(newAccount, "Nombre").fill("Cuenta corriente");
  // Pick the bank from the searchable list of Chilean institutions.
  await field(newAccount, "Institución").fill("santa");
  await page.getByRole("option", { name: /Santander/ }).click();
  await expect(field(newAccount, "Institución")).toHaveValue("Santander");
  await field(newAccount, "Saldo inicial").fill("500.000");
  await button(newAccount, "Crear cuenta").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Cuenta corriente" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Santander" }).first()).toBeVisible();

  // Credit card account with a credit line.
  await open(page, "/accounts/new");
  await field(page, "Tipo de cuenta").selectOption("CREDIT_CARD");
  await field(page, "Nombre").fill("Visa Banco");
  // A Chilean card: a peso quota and a dollar quota at the same time.
  await field(page, "Cupo (CLP)").fill("1.000.000");
  await field(page, "Cupo (USD)").fill("2.000");
  await button(page, "Crear cuenta").click();
  await expect(page.getByRole("heading", { name: "Visa Banco" })).toBeVisible();
  await expect(page.getByText("Internacional USD · Usado 0%")).toBeVisible();
  await button(page, "Agregar tarjeta").click();
  const newCard = await dialog(page, "Agregar tarjeta");
  await field(newCard, "Nombre").fill("Titular");
  await newCard.locator("label").filter({ hasText: "Mastercard" }).click();
  await field(newCard, "Últimos 4").fill("4242");
  await button(newCard, "Agregar tarjeta").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // The card shows its network logo.
  await expect(
    page
      .getByRole("listitem")
      .filter({ hasText: "Titular" })
      .getByRole("img", { name: "Mastercard" }),
  ).toBeVisible();
  await shot(page, "02-credit-card");

  // Accounts are grouped by bank; the card without an institution sits apart from cash.
  await open(page, "/accounts");
  await expect(page.getByRole("heading", { name: "Santander" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sin institución" })).toBeVisible();
  await shot(page, "02b-accounts");

  // An expense paid from the checking account.
  await open(page, "/transactions/new?type=expense");
  await field(page, "Monto").fill("45.990");
  await field(page, "Descripción").fill("Supermercado semana");
  await field(page, "Categoría").selectOption({ label: "Supermercado" });
  await field(page, "Cuenta").selectOption({ label: "Cuenta corriente (CLP)" });
  await shot(page, "03-expense-form");
  await button(page, "Registrar gasto").click();
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(page.getByText("Supermercado semana")).toBeVisible();

  // A purchase in 6 installments on the credit card.
  await open(page, "/transactions/new?type=installments");
  await field(page, "Descripción").fill("Notebook");
  await field(page, "Monto total").fill("600.000");
  await field(page, "Número de cuotas").fill("6");
  await field(page, "Categoría").selectOption({ label: "Tecnología" });
  await expect(page.getByText("6 cuotas de $100.000")).toBeVisible();
  await button(page, "Registrar compra en cuotas").click();
  await expect(page).toHaveURL(/\/installments$/);
  await expect(page.getByText("0/6 cuotas")).toBeVisible();
  await shot(page, "04-installments");

  // Someone owes me money.
  await open(page, "/debts");
  await button(page, "Nueva persona").click();
  const newPerson = await dialog(page, "Nueva persona");
  await field(newPerson, "Nombre").fill("Martín");
  await button(newPerson, "Agregar persona").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("link", { name: /Martín/ })
    .filter({ visible: true })
    .click();
  await expect(page.getByRole("heading", { name: "Martín" })).toBeVisible({ timeout: 20_000 });
  await page.waitForLoadState("networkidle");
  await button(page, "Nueva deuda").click();
  let newDebt = await dialog(page, "Nueva deuda con Martín");
  await field(newDebt, "Descripción").fill("Entradas concierto");
  await field(newDebt, "Categoría").selectOption({ label: "Salidas" });
  await field(newDebt, "Monto").fill("30.000");
  await button(newDebt, "Registrar deuda").click();
  await expect(page.getByText("Te debe $30.000").first()).toBeVisible();

  // Edit it: the amount was actually 35.000.
  await page.getByRole("link", { name: "Editar deuda" }).filter({ visible: true }).click();
  // First visit compiles the route in dev mode, which can take a few seconds.
  await expect(page.getByRole("heading", { name: "Editar deuda" })).toBeVisible({
    timeout: 20_000,
  });
  await page.waitForLoadState("networkidle");
  await field(page, "Monto").fill("35.000");
  await button(page, "Guardar cambios").click();
  await expect(page.getByText("Te debe $35.000").first()).toBeVisible();

  // Martín pays back 5.000 (a payment, from the debt's own dialog).
  await button(page, "Registrar abono").click();
  const payment = await dialog(page, "Registrar abono");
  await field(payment, "Monto del abono").fill("5.000");
  await button(payment, "Registrar abono").click();
  await expect(page.getByText("Te debe $30.000").first()).toBeVisible();

  // Martín paid my lunch: I owe him (pending; it becomes spending when I pay it).
  await button(page, "Nueva deuda").click();
  newDebt = await dialog(page, "Nueva deuda con Martín");
  await field(newDebt, "Debo (me prestaron o pagaron por mí)").check();
  await field(newDebt, "Descripción").fill("Almuerzo");
  await field(newDebt, "Categoría").selectOption({ label: "Restaurantes" });
  await field(newDebt, "Monto").fill("10.000");
  await button(newDebt, "Registrar deuda").click();
  await expect(page.getByText("Te debe $20.000").first()).toBeVisible();
  await shot(page, "05-debts");

  // Dashboard reflects everything.
  await open(page, "/dashboard");
  // Debts are pending, not spending: only the 45.990 expense counts.
  await expect(page.getByText("$45.990").first()).toBeVisible();
  await expect(page.getByText("Deudas pendientes")).toBeVisible();
  await expect(page.getByText("$10.000").first()).toBeVisible();
  await expect(page.getByText("$30.000").first()).toBeVisible();
  await expect(page.getByText("Patrimonio neto")).toBeVisible();
  await expect(page.getByText("Gastos por categoría")).toBeVisible();
  await page.waitForTimeout(500);
  await shot(page, "06-dashboard");

  await open(page, "/categories");
  await shot(page, "07-categories");

  // Add a subcategory from its parent's shortcut (opens in a dialog).
  await page
    .getByRole("link", { name: "Agregar subcategoría a Alimentación" })
    .filter({ visible: true })
    .click();
  const newCategory = await dialog(page, "Nueva categoría");
  await expect(newCategory.getByText("Se creará como subcategoría de Alimentación.")).toBeVisible();
  await field(newCategory, "Nombre").fill("Panadería");
  await button(newCategory, "Crear categoría").click();
  await expect(page).toHaveURL(/\/categories$/);
  await expect(page.getByRole("link", { name: "Panadería", exact: true })).toBeVisible();
});
