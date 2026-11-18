import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requireUser } from "@/modules/identity";
import { getPantry } from "@/modules/meals";
import { AddStockForm, PantryList } from "@/modules/meals/ui";
import { FormDialog, PageHeader } from "@/shared/ui";

export const metadata: Metadata = { title: "Despensa" };

export default async function PantryPage() {
  const user = await requireUser();
  const pantry = await getPantry(user.id);
  const days = pantry.settings.coverageDays;
  return (
    <>
      <PageHeader
        title="Despensa"
        description={`Lo que hay en casa. Te aviso si no alcanza para ${days} ${days === 1 ? "día" : "días"} de bloques.`}
        actions={
          pantry.foods.length > 0 ? (
            <FormDialog
              trigger="Agregar a la despensa"
              title="Agregar a la despensa"
              icon={<Plus className="size-4" />}
            >
              <AddStockForm foods={pantry.foods} categories={pantry.categories} />
            </FormDialog>
          ) : null
        }
      />
      <PantryList {...pantry} />
    </>
  );
}
