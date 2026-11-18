import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardTitle, EmptyState, FormDialog, InlineAction } from "@/shared/ui";
import type { Food, FoodCategory } from "../domain/food";
import {
  deleteFoodAction,
  deleteFoodCategoryAction,
  renameFoodCategoryAction,
  toggleFoodArchivedAction,
  toggleFoodCategoryArchivedAction,
  updateFoodAction,
} from "./actions";
import { FoodCategoryForm, FoodForm } from "./catalog-forms";
import { FoodIcon } from "./food-icons";
import { formatServingSize } from "./format";

function FoodRow({ food, categories }: { food: Food; categories: readonly FoodCategory[] }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="border-border flex size-9 shrink-0 items-center justify-center rounded-xs border">
        <FoodIcon icon={food.icon} className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{food.name}</p>
        <p className="text-muted text-xs">{formatServingSize(food)}</p>
      </div>
      <div className="flex items-center">
        <FormDialog
          trigger={null}
          title="Editar comida"
          description={food.name}
          variant="ghost"
          buttonSize="icon"
          ariaLabel={`Editar ${food.name}`}
          icon={<Pencil className="size-4" />}
          size="lg"
        >
          <FoodForm
            action={updateFoodAction.bind(null, food.id)}
            food={food}
            categories={categories.filter((c) => !c.archived || c.id === food.categoryId)}
          />
        </FormDialog>
        <InlineAction
          action={toggleFoodArchivedAction.bind(null, food.id, true)}
          label=""
          icon={<Archive className="size-4" aria-label={`Archivar ${food.name}`} />}
        />
        <InlineAction
          action={deleteFoodAction.bind(null, food.id)}
          label=""
          confirm={`¿Eliminar ${food.name}?`}
          icon={<Trash2 className="size-4" aria-label={`Eliminar ${food.name}`} />}
        />
      </div>
    </li>
  );
}

/** Food categories with their foods; archived ones at the end, to restore. */
export function FoodCatalog({
  categories,
  foods,
}: {
  /** Including archived ones. */
  categories: readonly FoodCategory[];
  foods: readonly Food[];
}) {
  const active = categories.filter((c) => !c.archived);
  const archivedCategories = categories.filter((c) => c.archived);
  const archivedFoods = foods.filter((f) => f.archived);
  if (categories.length === 0) {
    return (
      <EmptyState
        title="Empieza por las categorías"
        description="Agrupa tus comidas en categorías (Proteínas, Carbohidratos, Verduras…). Los bloques piden porciones de cada una."
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {active.map((category) => {
        const own = foods.filter((f) => f.categoryId === category.id && !f.archived);
        return (
          <Card key={category.id} aria-label={category.name}>
            <CardTitle
              description={own.length === 1 ? "1 comida" : `${own.length} comidas`}
              action={
                <div className="flex items-center">
                  <FormDialog
                    trigger="Comida"
                    title="Nueva comida"
                    description={category.name}
                    variant="ghost"
                    icon={<Plus className="size-4" />}
                    ariaLabel={`Nueva comida en ${category.name}`}
                    size="lg"
                  >
                    <FoodForm categories={active} defaultCategoryId={category.id} />
                  </FormDialog>
                  <FormDialog
                    trigger={null}
                    title="Editar categoría"
                    variant="ghost"
                    buttonSize="icon"
                    ariaLabel={`Editar categoría ${category.name}`}
                    icon={<Pencil className="size-4" />}
                  >
                    <FoodCategoryForm
                      action={renameFoodCategoryAction.bind(null, category.id)}
                      category={category}
                    />
                  </FormDialog>
                  <InlineAction
                    action={toggleFoodCategoryArchivedAction.bind(null, category.id, true)}
                    label=""
                    icon={
                      <Archive
                        className="size-4"
                        aria-label={`Archivar categoría ${category.name}`}
                      />
                    }
                  />
                  <InlineAction
                    action={deleteFoodCategoryAction.bind(null, category.id)}
                    label=""
                    confirm={`¿Eliminar la categoría ${category.name}?`}
                    icon={
                      <Trash2
                        className="size-4"
                        aria-label={`Eliminar categoría ${category.name}`}
                      />
                    }
                  />
                </div>
              }
            >
              {category.name}
            </CardTitle>
            {own.length === 0 ? (
              <p className="text-muted text-sm">Sin comidas todavía.</p>
            ) : (
              <ul className="divide-border -my-2.5 divide-y">
                {own.map((food) => (
                  <FoodRow key={food.id} food={food} categories={categories} />
                ))}
              </ul>
            )}
          </Card>
        );
      })}

      {archivedCategories.length + archivedFoods.length > 0 ? (
        <details className="border-border rounded-xs border px-4 py-3">
          <summary className="text-muted cursor-pointer text-sm">
            Archivadas ({archivedCategories.length + archivedFoods.length})
          </summary>
          <ul className="divide-border mt-2 divide-y">
            {archivedCategories.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span>Categoría · {category.name}</span>
                <InlineAction
                  action={toggleFoodCategoryArchivedAction.bind(null, category.id, false)}
                  label="Restaurar"
                  icon={<ArchiveRestore className="size-4" />}
                />
              </li>
            ))}
            {archivedFoods.map((food) => (
              <li key={food.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <FoodIcon icon={food.icon} className="text-muted size-4" />
                  {food.name}
                </span>
                <InlineAction
                  action={toggleFoodArchivedAction.bind(null, food.id, false)}
                  label="Restaurar"
                  icon={<ArchiveRestore className="size-4" />}
                />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
