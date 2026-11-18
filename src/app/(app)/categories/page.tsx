import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { getCategoryTree } from "@/modules/categories";
import { CategoryTreeList, addDefaultCategoriesAction } from "@/modules/categories/ui";
import { requireUser } from "@/modules/identity";
import { ButtonLink, Card, CardTitle, EmptyState, InlineAction, PageHeader } from "@/shared/ui";
import { MORE_BACK } from "../nav-items";

export const metadata: Metadata = { title: "Categorías" };

export default async function CategoriesPage({ searchParams }: PageProps<"/categories">) {
  const user = await requireUser();
  const includeArchived = (await searchParams).archived === "1";
  const [expenses, incomes] = await Promise.all([
    getCategoryTree(user.id, { kind: "EXPENSE", includeArchived }),
    getCategoryTree(user.id, { kind: "INCOME", includeArchived }),
  ]);
  return (
    <>
      <PageHeader
        back={MORE_BACK}
        title="Categorías"
        description="Organiza tus gastos en categorías y subcategorías, y define si son fijos o variables y necesarios o prescindibles."
        actions={
          <>
            <ButtonLink
              href={includeArchived ? "/categories" : "/categories?archived=1"}
              variant="ghost"
              size="sm"
            >
              {includeArchived ? "Ocultar archivadas" : "Ver archivadas"}
            </ButtonLink>
            <ButtonLink href="/categories/new" size="sm">
              <Plus className="size-4" /> Nueva categoría
            </ButtonLink>
          </>
        }
      />
      {expenses.length === 0 && incomes.length === 0 && !includeArchived ? (
        <div className="mb-4">
          <EmptyState
            title="Aún no tienes categorías"
            description="Sin categorías no puedes registrar gastos ni deudas. Agrega las sugeridas (Supermercado, Transporte, Sueldo…) y ajústalas después, o crea las tuyas."
            action={
              <InlineAction
                action={addDefaultCategoriesAction}
                label="Agregar categorías sugeridas"
                variant="secondary"
              />
            }
          />
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardTitle>Gastos</CardTitle>
          <CategoryTreeList tree={expenses} />
        </Card>
        <Card className="self-start">
          <CardTitle
            action={
              <ButtonLink href="/categories/new?kind=INCOME" variant="ghost" size="sm">
                <Plus className="size-4" />
              </ButtonLink>
            }
          >
            Ingresos
          </CardTitle>
          <CategoryTreeList tree={incomes} />
        </Card>
      </div>
    </>
  );
}
