import { describe, expect, it } from "vitest";
import { INSTITUTIONS, findInstitution, searchInstitutions } from "./institutions";

describe("institutions catalog", () => {
  it("finds institutions by name or alias, ignoring case and accents", () => {
    expect(findInstitution("Banco de Chile")?.id).toBe("banco-de-chile");
    expect(findInstitution("banco edwards")?.id).toBe("banco-de-chile");
    expect(findInstitution("ITAU")?.id).toBe("itau");
    expect(findInstitution("CuentaRUT")?.id).toBe("bancoestado");
    expect(findInstitution("Banco Security")?.id).toBe("bice");
    expect(findInstitution("Banco Andino")).toBeNull();
    expect(findInstitution(null)).toBeNull();
  });

  it("searches across names and aliases", () => {
    expect(searchInstitutions("falabella").map((i) => i.id)).toEqual(["banco-falabella", "cmr"]);
    expect(searchInstitutions("")).toHaveLength(INSTITUTIONS.length);
  });

  it("has unique ids and names", () => {
    expect(new Set(INSTITUTIONS.map((i) => i.id)).size).toBe(INSTITUTIONS.length);
    expect(new Set(INSTITUTIONS.map((i) => i.name)).size).toBe(INSTITUTIONS.length);
  });
});
