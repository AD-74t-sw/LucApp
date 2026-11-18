import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategory, listCategories } from "@/modules/categories";
import { CategoryForm, deleteCategoryAction, updateCategoryAction } from "@/modules/categories/ui";
import { requireUser } from "@/modules/identity";
import { isUuid } from "@/shared/domain";
import { Card, InlineAction, PageHeader } from "@/shared/ui";

export const metadata: Metadata = { title: "Editar categoría" };

export default async function EditCategoryPage({ params }: PageProps<"/categories/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const user = await requireUser();
  const [category, all] = await Promise.all([getCategory(user.id, id), listCategories(user.id)]);
  if (!category) notFound();
  return (
    <>
      <PageHeader
        back={{ href: "/categories", label: "Categorías" }}
        title={`Editar ${category.name}`}
        actions={
          <InlineAction
            action={deleteCategoryAction.bind(null, category.id)}
            label="Eliminar"
            variant="danger"
            confirm="¿Eliminar esta categoría? Solo es posible si no tiene movimientos ni subcategorías."
          />
        }
      />
      <Card className="max-w-3xl">
        <CategoryForm
          action={updateCategoryAction.bind(null, category.id)}
          parents={all.filter((c) => c.parentId === null)}
          category={category}
        />
      </Card>
    </>
  );
}
