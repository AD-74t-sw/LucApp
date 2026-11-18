import { describe, expect, it } from "vitest";
import { detectInstitution } from "./bank-profiles";
import { parseWalletPayment, walletAmount, walletCardKey } from "./wallet";

describe("walletAmount", () => {
  it("reads the amount however Shortcuts formats it", () => {
    expect(walletAmount("$12.990")).toEqual({ amount: 12_990, currency: "CLP" });
    expect(walletAmount("12990")).toEqual({ amount: 12_990, currency: "CLP" });
    expect(walletAmount("CLP 12.990")).toEqual({ amount: 12_990, currency: "CLP" });
    expect(walletAmount("12.990,00")).toEqual({ amount: 12_990, currency: "CLP" });
    expect(walletAmount("US$ 10,50")).toEqual({ amount: 1_050, currency: "USD" });
    expect(walletAmount("10.5", "USD")).toEqual({ amount: 1_050, currency: "USD" });
    expect(walletAmount("USD 1,234.56")).toEqual({ amount: 123_456, currency: "USD" });
  });

  it("returns null without a positive number", () => {
    expect(walletAmount("gratis")).toBeNull();
    expect(walletAmount("$0")).toBeNull();
  });
});

describe("parseWalletPayment", () => {
  it("turns an Apple Pay payment into a purchase, reading the bank from the card", () => {
    const payment = parseWalletPayment({
      amount: "$12.990",
      merchant: "  JUMBO  LA REINA ",
      card: "Visa Crédito Banco de Chile",
    });
    expect(payment?.parsed).toMatchObject({
      kind: "PURCHASE",
      amount: 12_990,
      currency: "CLP",
      merchant: "JUMBO LA REINA",
      institution: "Banco de Chile",
      instrument: "CREDIT",
      last4: null,
    });
    expect(payment?.text).toBe(
      "Apple Pay: $12.990 en JUMBO LA REINA con Visa Crédito Banco de Chile",
    );
  });

  it("is nothing to record without amount or merchant", () => {
    expect(parseWalletPayment({ merchant: "JUMBO" })).toBeNull();
    expect(parseWalletPayment({ amount: "$1.000" })).toBeNull();
  });
});

describe("walletCardKey", () => {
  it("is the same for the same card written differently, and never a merchant key", () => {
    expect(walletCardKey("Tenpo  Mastercard")).toBe("wallet-card:tenpomastercard");
    expect(walletCardKey("tenpo mastercard")).toBe(walletCardKey("Tenpo Mastercard"));
    expect(walletCardKey(null)).toBeNull();
  });
});

describe("detectInstitution with app names", () => {
  it("recognizes the bank from the name of its app", () => {
    expect(detectInstitution("Mi Banco", "Compra por $1.000")?.institution).toBe("Banco de Chile");
    expect(detectInstitution("Santander Chile", "Compra por $1.000")?.institution).toBe(
      "Santander",
    );
    expect(detectInstitution("Itaú", "Compra por $1.000")?.institution).toBe("Itaú");
    expect(detectInstitution("MACH", "Compra por $1.000")?.institution).toBe("MACH");
  });
});
