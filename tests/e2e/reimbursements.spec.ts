import { expect, test } from "@playwright/test";
import { button, dialog, field, open, shot, signUp } from "./helpers";

/**
 * A health-plan reimbursement: noted while in review (no amount yet), then the
 * approved amount and payment window, then marked as received into the cash account.
 */
test("a reimbursement goes from in review to received", async ({ page }) => {
  await signUp(page, "Rosa Prueba");

  await open(page, "/reimbursements");
  await button(page, "Nueva devolución").click();
  const newClaim = await dialog(page, "Nueva devolución");
  await field(newClaim, "¿Quién devuelve?").fill("Isapre Colmena");
  await field(newClaim, "Descripción").fill("Consulta traumatólogo");
  await button(newClaim, "Agregar devolución").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  const card = page.getByRole("region", { name: "Consulta traumatólogo" });
  await expect(card.getByText("En revisión")).toBeVisible();
  await expect(card.getByText("Monto por confirmar")).toBeVisible();

  // The isapre answers: 18.500, paid within the next days.
  await button(card, "Ingresar monto y fechas").click();
  const approval = await dialog(page, "Monto y fechas de pago");
  await field(approval, "Monto a devolver (CLP)").fill("18.500");
  const day = (offset: number) => {
    const date = new Date(Date.now() + offset * 86_400_000);
    return date.toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
  };
  await field(approval, "Desde").fill(day(0));
  await field(approval, "Hasta").fill(day(7));
  await button(approval, "Guardar monto y fechas").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card.getByText("Por recibir", { exact: true })).toBeVisible();
  await expect(card.getByText("$18.500")).toBeVisible();
  await shot(page, "reimbursements-01-approved");

  // The money arrives in cash and is recorded as income.
  await button(card, "Marcar como devuelta").click();
  const receipt = await dialog(page, "Marcar como devuelta");
  await field(receipt, "¿A qué cuenta llegó? (opcional)").selectOption({ label: "Efectivo (CLP)" });
  await expect(field(receipt, "Categoría del ingreso")).toHaveValue(/.+/);
  await button(receipt, "Marcar como devuelta").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card.getByText("Devuelta")).toBeVisible();
  await expect(card.getByText(/registrada como ingreso/)).toBeVisible();
  await shot(page, "reimbursements-02-received");

  await open(page, "/transactions");
  await expect(page.getByText("Devolución Isapre Colmena: Consulta traumatólogo")).toBeVisible();
});
