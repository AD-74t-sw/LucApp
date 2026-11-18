import Link from "next/link";
import { BellOff, Check, ChevronRight, RotateCcw, TriangleAlert, X } from "lucide-react";
import type { LocalDate, LocalTime } from "@/shared/domain";
import { Badge, ButtonLink, Card, EmptyState, FormDialog, InlineAction, cn } from "@/shared/ui";
import { type MealBlock, isActiveAt } from "../domain/block";
import type { CategoryCoverage } from "../domain/coverage";
import type { Food, FoodCategory } from "../domain/food";
import type { Meal } from "../domain/meal";
import {
  clearPlanAction,
  eatMealAction,
  eatPlannedAction,
  planMealAction,
  undoMealAction,
} from "./actions";
import { FoodIcon } from "./food-icons";
import { formatNumber, formatServings } from "./format";
import { EatPlannedForm, type ItemRow, MealItemsForm } from "./meal-forms";

type Context = {
  date: LocalDate;
  today: LocalDate;
  /** Current time when `date` is today, to highlight the block going on. */
  now: LocalTime | null;
  foods: readonly Food[];
  categories: readonly FoodCategory[];
};

/**
 * Starting rows for a block without a plan: one per category it asks for,
 * with a food already chosen when the pantry has enough of one.
 */
function suggestedRows(block: MealBlock, foods: readonly Food[]): ItemRow[] {
  return block.portions.map((portion) => {
    const inStock = foods.find(
      (f) => f.categoryId === portion.categoryId && f.stock >= f.unitSize * portion.servings,
    );
    return {
      foodId: inStock?.id ?? "",
      servings: portion.servings,
      categoryId: portion.categoryId,
    };
  });
}

function BlockCard({
  block,
  meal,
  context,
}: {
  block: MealBlock;
  meal: Meal | undefined;
  context: Context;
}) {
  const { date, today, now, foods, categories } = context;
  const byId = new Map(foods.map((f) => [f.id, f]));
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const eaten = meal?.status === "EATEN";
  const planned = meal?.status === "PLANNED" && meal.items.length > 0;
  const canEat = date <= today;
  const goingOn = now !== null && isActiveAt(block, now) && !eaten;
  const subtitle = `${block.name} · ${block.startTime}–${block.endTime}`;
  const plan = meal?.items.map((i) => ({ foodId: i.foodId, servings: i.servings })) ?? [];
  const rows: ItemRow[] = planned
    ? plan.map((i) => ({ ...i, categoryId: byId.get(i.foodId)?.categoryId }))
    : suggestedRows(block, foods);

  return (
    <Card aria-label={block.name} className={cn("flex flex-col gap-3", goingOn && "border-accent")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{block.name}</p>
            {eaten ? (
              <Badge tone="positive">Comido</Badge>
            ) : planned ? (
              <Badge tone="accent">Planificado</Badge>
            ) : (
              <Badge>Sin planificar</Badge>
            )}
            {goingOn ? <Badge tone="warning">Ahora</Badge> : null}
          </div>
          <p className="text-muted font-mono text-xs">
            {block.startTime}–{block.endTime}
            {block.notify ? null : (
              <BellOff className="ml-1.5 inline size-3" aria-label="Sin aviso" />
            )}
          </p>
        </div>
      </div>

      {meal && meal.items.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {meal.items.map((item) => {
            const food = byId.get(item.foodId);
            return (
              <li key={item.foodId} className="flex items-center gap-2 text-sm">
                <FoodIcon icon={food?.icon ?? null} className="text-muted size-4" />
                <span className="flex-1">{food?.name ?? "Comida archivada"}</span>
                <span className="text-muted">{formatServings(item.servings)}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted text-sm">
          {block.portions
            .map(
              (p) =>
                `${categoryName.get(p.categoryId) ?? "Categoría"} ×${formatNumber(p.servings)}`,
            )
            .join(" · ")}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {eaten ? (
          <InlineAction
            action={undoMealAction.bind(null, block.id, date)}
            label="Deshacer"
            confirm="¿Marcar como no comido? Lo que se descontó vuelve a la despensa."
            icon={<RotateCcw className="size-4" />}
          />
        ) : (
          <>
            {canEat ? (
              <FormDialog
                trigger="Marcar como comido"
                title={planned ? "Marcar como comido" : "¿Qué comiste?"}
                description={subtitle}
                variant={goingOn || planned ? "primary" : "secondary"}
                icon={<Check className="size-4" />}
              >
                {planned ? (
                  <EatPlannedForm
                    eatPlanned={eatPlannedAction.bind(null, block.id, date)}
                    eatOther={eatMealAction.bind(null, block.id, date)}
                    plan={plan}
                    foods={foods}
                    categories={categories}
                  />
                ) : (
                  <MealItemsForm
                    action={eatMealAction.bind(null, block.id, date)}
                    rows={rows}
                    foods={foods}
                    categories={categories}
                    submitLabel="Marcar como comido"
                  />
                )}
              </FormDialog>
            ) : null}
            <FormDialog
              trigger={planned ? "Cambiar plan" : "Planificar"}
              title={planned ? "Cambiar plan" : "Planificar"}
              description={subtitle}
              variant={canEat ? "ghost" : "primary"}
            >
              <MealItemsForm
                action={planMealAction.bind(null, block.id, date)}
                rows={rows}
                foods={foods}
                categories={categories}
                submitLabel="Guardar plan"
              />
            </FormDialog>
            {planned ? (
              <InlineAction
                action={clearPlanAction.bind(null, block.id, date)}
                label="Borrar plan"
                icon={<X className="size-4" />}
              />
            ) : null}
          </>
        )}
      </div>
    </Card>
  );
}

/** The day's blocks in order, each with its plan or what was eaten. */
export function DayBlocks({
  blocks,
  meals,
  ...context
}: Context & { blocks: readonly MealBlock[]; meals: readonly Meal[] }) {
  if (blocks.length === 0) {
    return (
      <EmptyState
        title="Aún no tienes bloques"
        description="Un bloque es una comida del día con su horario y cuántas porciones de cada categoría lleva: desayuno, almuerzo, once, cena."
        action={<ButtonLink href="/meals/blocks">Crear bloques</ButtonLink>}
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block) => (
        <BlockCard
          key={block.id}
          block={block}
          meal={meals.find((m) => m.blockId === block.id)}
          context={context}
        />
      ))}
    </div>
  );
}

/** "Falta comida en casa": categories that will not last, linking to the pantry. */
export function ShortageBanner({
  shortages,
  categories,
  days,
}: {
  shortages: readonly CategoryCoverage[];
  categories: readonly FoodCategory[];
  days: number;
}) {
  if (shortages.length === 0) return null;
  const names = new Map(categories.map((c) => [c.id, c.name]));
  return (
    <Link
      href="/meals/pantry"
      className="border-warning/30 bg-warning-soft text-warning hover:border-warning flex items-center gap-3 rounded-xs border px-4 py-3 text-sm transition"
    >
      <TriangleAlert className="size-4 shrink-0" aria-hidden />
      <span className="flex-1">
        Falta comida en casa para {days} {days === 1 ? "día" : "días"}:{" "}
        {shortages
          .map((s) => `${names.get(s.categoryId) ?? "Categoría"} (faltan ${s.missing})`)
          .join(", ")}
        .
      </span>
      <ChevronRight className="size-4 shrink-0" aria-hidden />
    </Link>
  );
}
