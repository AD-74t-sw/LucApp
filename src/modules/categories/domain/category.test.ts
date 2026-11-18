import { describe, expect, it } from "vitest";
import {
  type Category,
  buildTree,
  categoryColor,
  resolveClassification,
  validateParent,
} from "./category";

function category(overrides: Partial<Category>): Category {
  return {
    id: "c",
    name: "Cat",
    kind: "EXPENSE",
    color: "#000000",
    parentId: null,
    defaultCostType: null,
    defaultNecessity: null,
    archived: false,
    ...overrides,
  };
}

const food = category({
  id: "food",
  name: "Alimentación",
  defaultCostType: "VARIABLE",
  defaultNecessity: "ESSENTIAL",
});
const restaurants = category({
  id: "rest",
  name: "Restaurantes",
  parentId: "food",
  defaultNecessity: "DISCRETIONARY",
});

describe("category tree", () => {
  it("groups subcategories under their parent", () => {
    const tree = buildTree([restaurants, food, category({ id: "home", name: "Vivienda" })]);
    expect(tree.map((n) => n.name)).toEqual(["Alimentación", "Vivienda"]);
    expect(tree[0]!.children.map((c) => c.id)).toEqual(["rest"]);
  });

  it("allows only two levels and the same kind", () => {
    expect(validateParent("EXPENSE", food).ok).toBe(true);
    expect(validateParent("EXPENSE", restaurants).ok).toBe(false);
    expect(validateParent("INCOME", food).ok).toBe(false);
    expect(validateParent("EXPENSE", food, { selfId: "food" }).ok).toBe(false);
    expect(validateParent("EXPENSE", food, { selfHasChildren: true }).ok).toBe(false);
  });
});

describe("resolveClassification", () => {
  it("prefers the explicit choice, then the subcategory, then the parent", () => {
    expect(resolveClassification(restaurants, food)).toEqual({
      costType: "VARIABLE",
      necessity: "DISCRETIONARY",
    });
    expect(
      resolveClassification(restaurants, food, { costType: "FIXED", necessity: "ESSENTIAL" }),
    ).toEqual({
      costType: "FIXED",
      necessity: "ESSENTIAL",
    });
    expect(resolveClassification(category({}), null)).toEqual({ costType: null, necessity: null });
  });
});

describe("categoryColor", () => {
  it("uses the parent's color for subcategories", () => {
    const parent = category({ id: "p", color: "#123456" });
    expect(categoryColor("#ffffff", parent)).toBe("#123456");
    expect(categoryColor(undefined, parent)).toBe("#123456");
    expect(categoryColor("#ffffff", null)).toBe("#ffffff");
  });
});
