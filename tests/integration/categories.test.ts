import { afterAll, describe, expect, it } from "vitest";
import { listCategories } from "@/modules/categories";
import { createCategory, updateCategory } from "@/modules/categories/application/manage-categories";
import { prisma } from "@/shared/infrastructure";
import { categoryId, createUser, unwrap } from "./helpers";

afterAll(() => prisma.$disconnect());

describe("subcategory colors", () => {
  it("follow their parent on creation and when the parent changes", async () => {
    const userId = await createUser();
    const food = await categoryId(userId, "Alimentación");
    const before = (await listCategories(userId)).find((c) => c.id === food)!;

    const bakery = unwrap(
      await createCategory(userId, {
        name: "Panadería",
        kind: "EXPENSE",
        parentId: food,
        color: "#ff00ff",
      }),
    );
    expect(bakery.color).toBe(before.color);

    unwrap(await updateCategory(userId, food, { name: "Alimentación", color: "#112233" }));
    const children = (await listCategories(userId)).filter((c) => c.parentId === food);
    expect(children.length).toBeGreaterThan(1);
    expect(new Set(children.map((c) => c.color))).toEqual(new Set(["#112233"]));
  });
});
