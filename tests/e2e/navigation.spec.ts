import { expect, test } from "@playwright/test";
import { open, shot, signUp } from "./helpers";

/** Phone header: the avatar opens settings; signing out is the last option of "Más". */
test("phone header avatar and sign out from Más", async ({ page }) => {
  test.skip(test.info().project.name !== "mobile", "Phone navigation only");
  await signUp(page, "Nora Prueba");

  // The bar shows the page title, not the logo, and no sign out button.
  await expect(page.getByRole("heading", { name: "Resumen", level: 1 })).toBeVisible();
  await expect(page.getByLabel("LucApp, ir al resumen").filter({ visible: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toHaveCount(0);
  await page.getByRole("link", { name: "Ajustes de Nora Prueba" }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole("heading", { name: "Ajustes", level: 1 })).toBeVisible();
  await shot(page, "settings");

  // Sections opened from "Más" have a back button to it (the installed app has none).
  await page.getByRole("link", { name: "Volver a Más" }).click();
  await expect(page).toHaveURL(/\/menu$/);
  // "Por revisar" is also in the bottom bar: back button only when opened from "Más".
  await page.getByRole("main").getByRole("link", { name: "Por revisar" }).click();
  await expect(page.getByRole("heading", { name: "Por revisar", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Revisados" }).click();
  await expect(page).toHaveURL(/tab=reviewed/);
  await page.getByRole("link", { name: "Volver a Más" }).click();
  await expect(page).toHaveURL(/\/menu$/);
  await page
    .getByRole("navigation", { name: "Principal" })
    .getByRole("link", { name: "Revisar" })
    .click();
  await expect(page.getByRole("heading", { name: "Por revisar", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Volver a Más" })).toHaveCount(0);

  await open(page, "/menu");
  const options = page.getByRole("main").getByRole("listitem");
  await expect(options.last()).toHaveText("Cerrar sesión");
  await shot(page, "menu");
  await options.last().getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login/);
});
