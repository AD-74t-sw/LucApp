import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requireUser } from "@/modules/identity";
import { listFoodCategories, listFoods } from "@/modules/meals";
import { FoodCatalog, FoodCategoryForm, FoodForm } from "@/modules/meals/ui";
import { FormDialog, PageHeader } from "@/shared/ui";

export const metadata: Metadata = { title: "Catálogo" };

/** Food categories and the foods in each, with the size of one serving and an icon. */
export default async function FoodCatalogPage() {
  const user = await requireUser();
  const [categories, foods] = await Promise.all([
    listFoodCategories(user.id, { includeArchived: true }),
    listFoods(user.id, { includeArchived: true }),
  ]);
  const active = categories.filter((c) => !c.archived);
  return (
    <>
      <PageHeader
        title="Catálogo"
        description="Tus comidas por categoría y cuánto es una porción de cada una."
        actions={
          <>
            <FormDialog
              trigger="Nueva categoría"
              title="Nueva categoría"
              variant={active.length === 0 ? "primary" : "secondary"}
              icon={<Plus className="size-4" />}
            >
              <FoodCategoryForm />
            </FormDialog>
            {active.length > 0 ? (
              <FormDialog
                trigger="Nueva comida"
                title="Nueva comida"
                size="lg"
                icon={<Plus className="size-4" />}
              >
                <FoodForm categories={active} />
              </FormDialog>
            ) : null}
          </>
        }
      />
      <FoodCatalog categories={categories} foods={foods} />
    </>
  );
}
