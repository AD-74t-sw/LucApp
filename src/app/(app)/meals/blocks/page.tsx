import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requireUser } from "@/modules/identity";
import { listBlocks, listFoodCategories } from "@/modules/meals";
import { BlockForm, BlockList } from "@/modules/meals/ui";
import { FormDialog, PageHeader } from "@/shared/ui";

export const metadata: Metadata = { title: "Bloques" };

/** The meals of the day: schedule, notification and servings of each category. */
export default async function BlocksPage() {
  const user = await requireUser();
  const [blocks, categories] = await Promise.all([
    listBlocks(user.id, { includeArchived: true }),
    listFoodCategories(user.id),
  ]);
  return (
    <>
      <PageHeader
        title="Bloques"
        description="Las comidas de tu día. Se repiten todos los días y te aviso cuando empieza cada una."
        actions={
          <FormDialog
            trigger="Nuevo bloque"
            title="Nuevo bloque"
            size="lg"
            icon={<Plus className="size-4" />}
          >
            <BlockForm categories={categories} />
          </FormDialog>
        }
      />
      <BlockList blocks={blocks} categories={categories} />
    </>
  );
}
