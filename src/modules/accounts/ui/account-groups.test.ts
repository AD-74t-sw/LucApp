import { describe, expect, it } from "vitest";
import { groupByInstitution } from "./account-groups";

const account = (name: string, institution: string | null) => ({ name, institution });

describe("groupByInstitution", () => {
  it("groups catalog names and aliases together, sorted by name, cash last", () => {
    const groups = groupByInstitution([
      account("Efectivo", null),
      account("Cuenta corriente", "Santander"),
      account("Cuenta RUT", "CuentaRUT"),
      account("Visa", "Banco Santander"),
      account("Ahorro", "BancoEstado"),
    ]);
    expect(groups.map((g) => g.name)).toEqual(["BancoEstado", "Santander", null]);
    expect(groups[0]?.accounts.map((a) => a.name)).toEqual(["Cuenta RUT", "Ahorro"]);
    expect(groups[1]?.accounts.map((a) => a.name)).toEqual(["Cuenta corriente", "Visa"]);
    expect(groups[1]?.institution?.id).toBe("santander");
    expect(groups[2]?.accounts.map((a) => a.name)).toEqual(["Efectivo"]);
  });

  it("groups names outside the catalog by their normalized text", () => {
    const groups = groupByInstitution([
      account("A", "Mi Cooperativa"),
      account("B", "mi cooperativa "),
      account("C", "   "),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ name: "Mi Cooperativa", institution: null });
    expect(groups[0]?.accounts).toHaveLength(2);
    expect(groups[1]?.name).toBeNull();
  });
});
