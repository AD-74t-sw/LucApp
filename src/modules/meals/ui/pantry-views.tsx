import { Plus, SlidersHorizontal } from "lucide-react";
import { Badge, Card, CardTitle, EmptyState, FormDialog, ProgressBar, cn } from "@/shared/ui";
import type { CategoryCoverage } from "../domain/coverage";
import { type Food, type FoodCategory, servingsIn } from "../domain/food";
import type { MealSettings } from "../domain/settings";
import { setStockAction } from "./actions";
import { FoodIcon } from "./food-icons";
import { formatAmount, formatServings } from "./format";
import { AddStockForm, SetStockForm } from "./pantry-forms";

function CoverageBadge({ item }: { item: CategoryCoverage }) {
  if (item.perDay === 0) return <Badge>Ningún bloque la usa</Badge>;
  if (item.missing > 0) return <Badge tone="warning">Faltan {item.missing}</Badge>;
  return <Badge tone="positive">Alcanza</Badge>;
}

function FoodStockRow({
  food,
  foods,
  categories,
}: {
  food: Food;
  foods: readonly Food[];
  categories: readonly FoodCategory[];
}) {
  const servings = servingsIn(food);
  return (
    <li className="flex items-center gap-3 py-2.5">
      <FoodIcon
        icon={food.icon}
        className={cn("size-5 shrink-0", food.stock === 0 && "text-muted")}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm", food.stock === 0 ? "text-muted" : "font-medium")}>
          {food.name}
        </p>
        <p className="text-muted text-xs">
          {food.stock === 0
            ? "No hay"
            : `${formatAmount(food.stock, food.measure)} · ${formatServings(servings)}`}
        </p>
      </div>
      <div className="flex items-center">
        <FormDialog
          trigger={null}
          title="Agregar a la despensa"
          variant="ghost"
          buttonSize="icon"
          ariaLabel={`Agregar ${food.name}`}
          icon={<Plus className="size-4" />}
        >
          <AddStockForm foods={foods} categories={categories} defaultFoodId={food.id} />
        </FormDialog>
        <FormDialog
          trigger={null}
          title="Ajustar"
          description={food.name}
          variant="ghost"
          buttonSize="icon"
          ariaLabel={`Ajustar ${food.name}`}
          icon={<SlidersHorizontal className="size-4" />}
        >
          <SetStockForm action={setStockAction.bind(null, food.id)} food={food} />
        </FormDialog>
      </div>
    </li>
  );
}

/**
 * What is at home, by category, and whether it covers the next days of
 * blocks. Foods with stock come first.
 */
export function PantryList({
  settings,
  categories,
  foods,
  coverage,
}: {
  settings: MealSettings;
  categories: readonly FoodCategory[];
  foods: readonly Food[];
  coverage: readonly CategoryCoverage[];
}) {
  if (foods.length === 0) {
    return (
      <EmptyState
        title="La despensa está vacía"
        description="Primero crea tus comidas en el Catálogo; después anota aquí cuánto hay de cada una en casa."
      />
    );
  }
  const days = settings.coverageDays;
  return (
    <div className="flex flex-col gap-4">
      {categories.map((category) => {
        const own = foods
          .filter((f) => f.categoryId === category.id)
          .sort(
            (a, b) =>
              Number(b.stock > 0) - Number(a.stock > 0) || a.name.localeCompare(b.name, "es"),
          );
        const item = coverage.find((c) => c.categoryId === category.id);
        if (own.length === 0 && !item?.perDay) return null;
        return (
          <Card key={category.id} aria-label={category.name}>
            <CardTitle
              action={item ? <CoverageBadge item={item} /> : null}
              description={
                item && item.perDay > 0
                  ? `${formatServings(item.available)} de ${item.needed} para ${days} ${days === 1 ? "día" : "días"}`
                  : item
                    ? `${formatServings(item.available)} en casa`
                    : undefined
              }
            >
              {category.name}
            </CardTitle>
            {item && item.needed > 0 ? (
              <div className="-mt-2 mb-3">
                <ProgressBar
                  ratio={item.available / item.needed}
                  tone={item.missing > 0 ? "warning" : "accent"}
                />
              </div>
            ) : null}
            {own.length === 0 ? (
              <p className="text-muted text-sm">No hay comidas de esta categoría en el catálogo.</p>
            ) : (
              <ul className="divide-border -my-2.5 divide-y">
                {own.map((food) => (
                  <FoodStockRow key={food.id} food={food} foods={foods} categories={categories} />
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}
