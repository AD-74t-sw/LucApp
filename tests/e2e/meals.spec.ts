import { type Page, expect, test } from "@playwright/test";
import { button, dialog, field, open, shot, signUp } from "./helpers";

const isPhone = () => test.info().project.name === "mobile";

/** Moves to another app: the middle button of the phone bar, or the sidebar tabs. */
async function switchTo(page: Page, app: "Finanzas" | "Comidas") {
  if (isPhone()) {
    await page.getByRole("button", { name: "Cambiar de app" }).click();
    const switcher = page.getByRole("dialog", { name: "Cambiar de app" });
    await switcher.getByRole("link", { name: new RegExp(app) }).click();
  } else {
    await page.getByRole("navigation", { name: "Apps" }).getByRole("link", { name: app }).click();
  }
}

async function createCategory(page: Page, name: string) {
  await button(page, "Nueva categoría").click();
  const form = await dialog(page, "Nueva categoría");
  await field(form, "Nombre").fill(name);
  await button(form, "Crear categoría").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

async function createFood(page: Page, name: string, category: string, grams: string, icon: string) {
  await button(page, "Nueva comida").click();
  const form = await dialog(page, "Nueva comida");
  await field(form, "Nombre").fill(name);
  await field(form, "Categoría").selectOption({ label: category });
  await field(form, "Una porción es").fill(grams);
  await form.getByLabel("Buscar ícono").fill(icon);
  await form.getByRole("radio", { name: icon, exact: true }).check({ force: true });
  await button(form, "Crear comida").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

async function addToPantry(page: Page, food: string, amount: string, unit: string) {
  await button(page, "Agregar a la despensa").click();
  const form = await dialog(page, "Agregar a la despensa");
  await field(form, "Comida").selectOption({ label: food });
  await field(form, "Cantidad").fill(amount);
  await form.getByLabel("Unidad").selectOption({ label: unit });
  await button(form, "Agregar").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

/**
 * The meals app: switch from finance (dark) to meals (light), build the
 * catalog, a block and the pantry, then plan, eat, undo and "eat something
 * else", watching the pantry go down and warn when food runs short.
 */
test("meals: catalog, block, pantry, plan and eat", async ({ page }) => {
  await signUp(page, "Tomás Prueba");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "dark");
  if (isPhone()) {
    await expect(page.getByRole("link", { name: "Nuevo movimiento" })).toBeVisible();
  }

  await switchTo(page, "Comidas");
  await expect(page).toHaveURL(/\/meals$/);
  await expect(html).toHaveAttribute("data-theme", "light");
  await expect(page.getByText("Aún no tienes bloques")).toBeVisible();
  await expect(page.getByRole("link", { name: "Nuevo movimiento" })).toHaveCount(0);

  // Catalog: two categories and a food in each, with an icon.
  await open(page, "/meals/foods");
  await createCategory(page, "Proteínas");
  await createCategory(page, "Carbohidratos");
  await createFood(page, "Pollo", "Proteínas", "150", "Pollo");
  await createFood(page, "Arroz", "Carbohidratos", "80", "Arroz");
  const proteins = page.getByRole("region", { name: "Proteínas" });
  await expect(proteins.getByText("Pollo")).toBeVisible();
  await expect(proteins.getByText("1 porción = 150 g")).toBeVisible();
  await shot(page, "meals-01-catalog");

  // A block that lasts all day, so it is "going on" whenever the test runs.
  await open(page, "/meals/blocks");
  await button(page, "Nuevo bloque").click();
  const blockForm = await dialog(page, "Nuevo bloque");
  await field(blockForm, "Nombre").fill("Almuerzo");
  await field(blockForm, "Desde").fill("00:00");
  await field(blockForm, "Hasta").fill("23:59");
  await blockForm.getByLabel("Porciones de Proteínas").fill("1");
  await blockForm.getByLabel("Porciones de Carbohidratos").fill("1");
  await button(blockForm, "Crear bloque").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Almuerzo" }).getByText("Proteínas ×1"),
  ).toBeVisible();

  // Pantry: 300 g of chicken is 2 servings, short of 3 days of lunches.
  await open(page, "/meals/pantry");
  await addToPantry(page, "Pollo", "300", "gramos (g)");
  await addToPantry(page, "Arroz", "1", "kilos (kg)");
  const pantryProteins = page.getByRole("region", { name: "Proteínas" });
  await expect(pantryProteins.getByText("300 g · 2 porciones")).toBeVisible();
  await expect(pantryProteins.getByText("Faltan 1")).toBeVisible();
  await shot(page, "meals-02-pantry");

  // Today: plan the block (foods in stock come preselected), then eat the plan.
  await open(page, "/meals");
  await expect(page.getByText(/Falta comida en casa/)).toBeVisible();
  const lunch = page.getByRole("region", { name: "Almuerzo" });
  await button(lunch, "Planificar").click();
  const plan = await dialog(page, "Planificar");
  await button(plan, "Guardar plan").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(lunch.getByText("Planificado")).toBeVisible();

  await button(lunch, "Marcar como comido").click();
  const confirmEat = await dialog(page, "Marcar como comido");
  await button(confirmEat, "Sí, lo comí").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(lunch.getByText("Comido", { exact: true })).toBeVisible();
  await shot(page, "meals-03-eaten");

  await open(page, "/meals/pantry");
  await expect(
    page.getByRole("region", { name: "Proteínas" }).getByText("150 g · 1 porción"),
  ).toBeVisible();

  // Undo puts the chicken back; then "Comí otra cosa": two servings instead of one.
  await open(page, "/meals");
  page.once("dialog", (confirm) => confirm.accept());
  await button(lunch, "Deshacer").click();
  await expect(lunch.getByText("Planificado")).toBeVisible();
  await button(lunch, "Marcar como comido").click();
  const other = await dialog(page, "Marcar como comido");
  await button(other, "Comí otra cosa").click();
  await other.getByLabel("Porciones de Proteínas").fill("2");
  await button(other, "Marcar como comido").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(lunch.getByText("2 porciones")).toBeVisible();

  await open(page, "/meals/pantry");
  await expect(page.getByRole("region", { name: "Proteínas" }).getByText("No hay")).toBeVisible();

  // Back to finance: dark again.
  await switchTo(page, "Finanzas");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(html).toHaveAttribute("data-theme", "dark");
});
