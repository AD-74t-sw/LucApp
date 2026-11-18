import { listCategories } from "@/modules/categories";
import { CategoryForm, createCategoryAction } from "@/modules/categories/ui";
import { requireUser } from "@/modules/identity";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** "New category" content, shared by the full page and the dialog. */
export async function NewCategory({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const query = await searchParams;
  const kind = query.kind === "INCOME" ? "INCOME" : "EXPENSE";
  const parents = (await listCategories(user.id)).filter((c) => c.parentId === null);
  // `?parentId=` comes from the "+ Subcategoría" button; ignore anything that is not a parent.
  const parent = parents.find((p) => p.id === query.parentId && p.kind === kind);
  return (
    <>
      <p className="text-muted mb-4 text-sm">
        {parent
          ? `Se creará como subcategoría de ${parent.name}.`
          : "Para crear una subcategoría, elige su categoría principal."}
      </p>
      <CategoryForm
        action={createCategoryAction}
        parents={parents}
        defaultKind={kind}
        defaultParentId={parent?.id}
      />
    </>
  );
}
