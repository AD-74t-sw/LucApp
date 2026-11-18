import { describe, expect, it } from "vitest";
import { parseNotice } from "./parse-notice";

// Illustrative notices written like the ones each bank sends. Replace them with
// real (anonymized) ones when a bank's format is confirmed.
const parse = (text: string, sender?: string, subject?: string) =>
  parseNotice({ text, sender, subject }, 2026);

describe("parseNotice", () => {
  it("reads a Banco de Chile credit card purchase", () => {
    const notice = parse(
      "Te informamos que se ha realizado una compra por $12.345 con Tarjeta de Crédito ****1234 en LIDER EXPRESS 123 el 14/11/2026 12:34.",
      "enviodigital@bancochile.cl",
      "Compra con Tarjeta de Crédito",
    );
    expect(notice).toEqual({
      institution: "Banco de Chile",
      kind: "PURCHASE",
      instrument: "CREDIT",
      amount: 12345,
      currency: "CLP",
      merchant: "LIDER EXPRESS 123",
      counterpartyInstitution: null,
      last4: "1234",
      occurredOn: "2026-11-14",
      occurredTime: "12:34",
    });
  });

  it("reads a Santander SMS purchase", () => {
    const notice = parse(
      "Santander: Compra por $8.990 con tarjeta de debito XXXX5678 en UBER *TRIP 13/11/2026 21:05",
      "Santander",
    );
    expect(notice).toMatchObject({
      institution: "Santander",
      kind: "PURCHASE",
      instrument: "DEBIT",
      amount: 8990,
      merchant: "UBER *TRIP",
      last4: "5678",
      occurredOn: "2026-11-13",
      occurredTime: "21:05",
    });
  });

  it("reads a BancoEstado CuentaRUT purchase without a sender", () => {
    const notice = parse(
      "BancoEstado: Compra por $3.500 en FARMACIA CRUZ VERDE con tu CuentaRUT el 12/11/2026.",
    );
    expect(notice).toMatchObject({
      institution: "BancoEstado",
      kind: "PURCHASE",
      instrument: "DEBIT",
      amount: 3500,
      merchant: "FARMACIA CRUZ VERDE",
    });
  });

  it("reads a Bci transfer sent to another bank", () => {
    const notice = parse(
      "Transferiste $150.000 a Juan Pérez Soto, cuenta corriente en Santander, el 14/11/2026 a las 10:15.",
      "notificaciones@bci.cl",
    );
    expect(notice).toMatchObject({
      institution: "Bci",
      kind: "TRANSFER_OUT",
      amount: 150000,
      merchant: "Juan Perez Soto",
      counterpartyInstitution: "Santander",
      occurredTime: "10:15",
    });
  });

  it("reads a MACH transfer received", () => {
    const notice = parse("Recibiste $20.000 de Camila Rojas", "MACH");
    expect(notice).toMatchObject({
      institution: "MACH",
      kind: "TRANSFER_IN",
      amount: 20000,
      merchant: "Camila Rojas",
    });
  });

  it("reads a Tenpo purchase in dollars", () => {
    const notice = parse("Compraste US$ 12,50 en NETFLIX.COM con tu tarjeta Tenpo");
    expect(notice).toMatchObject({
      institution: "Tenpo",
      kind: "PURCHASE",
      amount: 1250,
      currency: "USD",
      merchant: "NETFLIX.COM",
    });
  });

  it("reads a credit card payment as such", () => {
    const notice = parse(
      "Pago de Tarjeta de Crédito por $250.000 realizado con éxito",
      "contacto@santander.cl",
    );
    expect(notice).toMatchObject({
      institution: "Santander",
      kind: "CARD_PAYMENT",
      amount: 250000,
    });
  });

  it("keeps Lider Bci apart from Bci and finds the other bank of a transfer", () => {
    expect(parse("Compra en JUMBO con tu tarjeta Lider Bci por $5.000").institution).toBe(
      "Lider Bci",
    );
  });

  it("reads labeled fields of transfer emails", () => {
    const notice = parse(
      "Comprobante de transferencia\nMonto: $45.000\nNombre del destinatario: María José Soto\nBanco: Banco Falabella",
      "transferencias@bancochile.cl",
    );
    expect(notice).toMatchObject({
      institution: "Banco de Chile",
      kind: "TRANSFER_OUT",
      amount: 45000,
      merchant: "Maria Jose Soto",
      counterpartyInstitution: "Banco Falabella",
    });
  });

  it("reads app notifications: a short title over a one-line body", () => {
    expect(
      parse(
        "Compra aprobada\nCompraste $12.990 en JUMBO LA REINA con tu tarjeta de crédito ****1234",
        "Mi Banco",
      ),
    ).toMatchObject({
      institution: "Banco de Chile",
      kind: "PURCHASE",
      instrument: "CREDIT",
      amount: 12990,
      merchant: "JUMBO LA REINA",
      last4: "1234",
      occurredOn: null,
    });
    expect(
      parse("Transferencia realizada\nTransferiste $50.000 a Martin Soto", "Santander"),
    ).toMatchObject({
      institution: "Santander",
      kind: "TRANSFER_OUT",
      amount: 50000,
      merchant: "Martin Soto",
    });
    expect(parse("Recibiste $30.000 de Camila Rojas", "Tenpo")).toMatchObject({
      institution: "Tenpo",
      kind: "TRANSFER_IN",
      amount: 30000,
      merchant: "Camila Rojas",
    });
  });

  it("never fails on text it does not understand", () => {
    expect(parse("Hola, tu clave dinámica vence pronto")).toMatchObject({
      institution: null,
      kind: "UNKNOWN",
      amount: null,
      merchant: null,
    });
  });
});
