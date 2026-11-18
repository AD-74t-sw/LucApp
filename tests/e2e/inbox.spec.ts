import { expect, test } from "@playwright/test";
import { button, dialog, field, open, shot, signUp } from "./helpers";

/**
 * Bank notices: a token for the iPhone Shortcuts, a purchase sent to the API
 * by SMS and again by email (merged), another one by notification and Apple
 * Pay (merged), an offer (ignored), then categorized from the inbox.
 */
test("bank notices arrive by API and are categorized in the inbox", async ({ page }) => {
  await signUp(page, "Tomás Prueba");

  // An account at the bank that sends the notices.
  await open(page, "/accounts/new");
  await field(page, "Nombre").fill("Cuenta Santander");
  await field(page, "Institución").fill("santa");
  await page.getByRole("option", { name: /Santander/ }).click();
  await field(page, "Saldo inicial").fill("300.000");
  await button(page, "Crear cuenta").click();
  await expect(page.getByRole("heading", { name: "Cuenta Santander" })).toBeVisible();

  // Token for the Shortcut, shown once.
  await open(page, "/inbox/connect");
  await field(page, "Nombre del dispositivo").fill("iPhone");
  await button(page, "Crear token").click();
  const token = (
    await page
      .locator("code")
      .filter({ hasText: /^lucapp_/ })
      .innerText()
  ).trim();
  await shot(page, "inbox-01-connect");

  // One guide per source: notifications first, Apple Pay in its own tab.
  await expect(page.getByText("la app de tu banco", { exact: false }).first()).toBeVisible();
  await page.getByRole("link", { name: "Apple Pay", exact: true }).click();
  await expect(page).toHaveURL(/via=wallet/);
  await expect(page.getByText("Transacción", { exact: true })).toBeVisible();

  // What the Shortcut sends: the SMS, then the email of the same purchase.
  const today = new Date().toLocaleDateString("es-CL", { timeZone: "America/Santiago" });
  const send = (data: Record<string, string>) =>
    page.request.post("/api/inbox", { headers: { Authorization: `Bearer ${token}` }, data });
  const sms = await send({
    channel: "SMS",
    sender: "Santander",
    text: `Santander: Compra por $8.990 con tarjeta de debito en JUMBO LA REINA ${today} 10:00`,
  });
  expect(sms.status()).toBe(201);
  const email = await send({
    channel: "EMAIL",
    sender: "contacto@santander.cl",
    subject: "Compra con tarjeta de débito",
    text: `Te informamos una compra por $8.990 en Jumbo La Reina el ${today} a las 10:01 hrs.`,
  });
  expect((await email.json()).outcome).toBe("DUPLICATE");
  expect((await send({ channel: "SMS", text: "x" }).then((r) => r.status())) === 201).toBe(true);
  expect(
    (
      await page.request.post("/api/inbox", {
        headers: { Authorization: "Bearer lucapp_nope" },
        data: { channel: "SMS", text: "Compra por $1" },
      })
    ).status(),
  ).toBe(401);

  // The bank app's notification and the Apple Pay payment of another purchase,
  // and an offer from the same app, which is not a movement.
  const push = await send({
    channel: "PUSH",
    sender: "Santander",
    title: "Compra aprobada",
    body: "Compraste $20.000 con tu tarjeta de débito",
  });
  expect((await push.json()).outcome).toBe("CREATED");
  const applePay = await send({
    channel: "WALLET",
    amount: "$20.000",
    merchant: "COPEC",
    card: "Débito Santander",
  });
  expect((await applePay.json()).outcome).toBe("DUPLICATE");
  const offer = await send({
    channel: "PUSH",
    sender: "Santander",
    text: "Aprovecha 30% dcto en tu compra sobre $15.000 en restaurantes",
  });
  expect(offer.status()).toBe(200);
  expect((await offer.json()).outcome).toBe("IGNORED");

  // One notice per purchase (plus the unreadable "x"), told how each one arrived.
  await open(page, "/inbox");
  const fuel = page.getByRole("article", { name: "COPEC" }).filter({ visible: true });
  await expect(fuel.getByText("Llegó por notificación y Apple Pay")).toBeVisible();
  await button(fuel, "Descartar").click();
  await expect(fuel).toHaveCount(0);
  const purchase = page.getByRole("article", { name: "JUMBO LA REINA" }).filter({ visible: true });
  await expect(purchase.getByText("Llegó por SMS y correo")).toBeVisible();
  await shot(page, "inbox-02-pending");

  const unreadable = page.getByRole("article", { name: "Movimiento" }).filter({ visible: true });
  await button(unreadable, "Descartar").click();
  await expect(unreadable).toHaveCount(0);

  await button(purchase, "Registrar").click();
  const review = await dialog(page, "Registrar aviso");
  await expect(field(review, "Monto")).toHaveValue("8990");
  await expect(field(review, "Cuenta")).toHaveValue(/.+/);
  await field(review, "Categoría").selectOption({ label: "Supermercado" });
  await shot(page, "inbox-03-review");
  await button(review, "Registrar gasto").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("No tienes avisos por revisar")).toBeVisible();

  await open(page, "/transactions");
  await expect(page.getByText("JUMBO LA REINA").first()).toBeVisible();
});
