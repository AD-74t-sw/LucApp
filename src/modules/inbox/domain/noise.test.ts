import { describe, expect, it } from "vitest";
import { isMovement } from "./noise";
import { parseNotice } from "./parse-notice";

/** Reads the text as a notification and says whether it would be kept. */
function kept(text: string): boolean {
  return isMovement(parseNotice({ text }, 2026), text);
}

describe("isMovement", () => {
  it("keeps purchases and transfers written the way apps notify them", () => {
    expect(
      kept("Compra aprobada\nCompraste $12.990 en JUMBO LA REINA con tu tarjeta ****1234"),
    ).toBe(true);
    expect(kept("Transferencia realizada\nTransferiste $50.000 a Martin Soto")).toBe(true);
    expect(kept("Recibiste una transferencia de $30.000 de Camila Rojas")).toBe(true);
    expect(kept("Pagaste US$ 9,99 en SPOTIFY con tu tarjeta de crédito")).toBe(true);
  });

  it("drops notifications without an amount or without a movement", () => {
    expect(kept("Tu estado de cuenta ya está disponible")).toBe(false);
    expect(kept("Hola, tenemos novedades para ti en la app")).toBe(false);
    expect(kept("Tu saldo disponible es $250.000")).toBe(false);
  });

  it("drops offers even when they name an amount and a purchase", () => {
    expect(kept("Aprovecha 40% dcto en tu compra sobre $20.000 en Jumbo")).toBe(false);
    expect(kept("Tienes un crédito pre-aprobado por $5.000.000. Simula tu pago en la app")).toBe(
      false,
    );
    expect(kept("Compra en 12 cuotas sin interés desde $30.000")).toBe(false);
  });

  it("drops security alerts, pending authorizations and declined payments", () => {
    expect(kept("Autoriza tu compra por $12.990 en JUMBO desde la app")).toBe(false);
    expect(kept("Tu compra por $45.000 en FALABELLA fue rechazada")).toBe(false);
    expect(kept("Tu código de verificación para el pago de $10.000 es 123456")).toBe(false);
  });
});
