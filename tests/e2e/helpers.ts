import { type Locator, type Page, expect, test } from "@playwright/test";

/** Next keeps previous pages mounted but hidden, so only visible controls are targeted. */
export function field(scope: Page | Locator, label: string) {
  return scope.getByLabel(label, { exact: true }).filter({ visible: true });
}

export function button(scope: Page | Locator, name: string) {
  return scope.getByRole("button", { name, exact: true }).filter({ visible: true });
}

/** The open dialog ("Nueva cuenta", "Registrar abono"…), once its form has loaded. */
export async function dialog(page: Page, title: string) {
  const locator = page.getByRole("dialog", { name: title });
  // The first open compiles the route in dev mode, which can take a few seconds.
  await expect(locator.locator("form")).toBeVisible({ timeout: 20_000 });
  return locator;
}

/** Navigates and waits until the page is hydrated, so typed values are not lost. */
export async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

export async function shot(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/screens/${test.info().project.name}-${name}.png`,
    fullPage: true,
  });
}

/** Signs up a fresh user (local Supabase does not require email confirmation). */
export async function signUp(page: Page, name: string) {
  const email = `e2e-${Date.now()}-${test.info().project.name}-${Math.random().toString(36).slice(2, 7)}@lucapp.test`;
  await open(page, "/register");
  await field(page, "Nombre").fill(name);
  await field(page, "Correo").fill(email);
  await field(page, "Contraseña").fill("una-clave-segura");
  await button(page, "Crear cuenta").click();
  // Signing up provisions the account; the first one compiles the dashboard in dev mode.
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
}
