"use client";

import { Plus, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import {
  type ActionState,
  ActionForm,
  Button,
  CancelButton,
  FormAlert,
  Input,
  Select,
  SubmitButton,
  fieldError,
  useFormAction,
} from "@/shared/ui";
import type { Food, FoodCategory } from "../domain/food";
import type { MealItemInput } from "../domain/meal";
import { FoodIcon } from "./food-icons";
import { editableNumber, formatServings } from "./format";
import { FoodOptions } from "./pantry-forms";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/** A starting row: a food already chosen (a plan), or a category to pick one from. */
export type ItemRow = { foodId: string; servings: number; categoryId?: string };

/** While editing, servings stay as typed ("1,5") until the form is sent. */
type Row = Omit<ItemRow, "servings"> & { servings: string; key: number };

/**
 * The foods of a meal, one row each: food and servings. Used to plan a block,
 * to say what was eaten when there was no plan, and for "Comí otra cosa".
 */
export function MealItemsForm({
  action,
  rows: initialRows,
  foods,
  categories,
  submitLabel,
}: {
  action: FormAction;
  rows: readonly ItemRow[];
  foods: readonly Food[];
  categories: readonly FoodCategory[];
  submitLabel: string;
}) {
  const id = useId();
  const form = useFormAction(action);
  const { state } = form;
  const nextKey = useRef(initialRows.length);
  const [rows, setRows] = useState<Row[]>(() =>
    (initialRows.length > 0 ? initialRows : [{ foodId: "", servings: 1 }]).map((row, key) => ({
      ...row,
      servings: editableNumber(row.servings),
      key,
    })),
  );
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  const update = (key: number, change: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...change } : row)));
  const remove = (key: number) => setRows((current) => current.filter((row) => row.key !== key));
  const add = () =>
    setRows((current) => [...current, { key: nextKey.current++, foodId: "", servings: "1" }]);

  if (foods.length === 0) {
    return (
      <p className="text-muted text-sm">
        Aún no tienes comidas en el catálogo. Créalas en Catálogo para poder elegirlas aquí.
      </p>
    );
  }

  return (
    <ActionForm form={form} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <ul className="flex flex-col gap-3">
        {rows.map((row, index) => {
          const category = row.categoryId ? categoryName.get(row.categoryId) : undefined;
          // Foods of the row's category first, so a block's suggestion is one tap away.
          const own = row.categoryId ? foods.filter((f) => f.categoryId === row.categoryId) : [];
          const error =
            fieldError(state, `items.${index}.foodId`) ??
            fieldError(state, `items.${index}.servings`);
          return (
            <li key={row.key} className="flex flex-col gap-1">
              <div className="flex items-end gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <label htmlFor={`${id}-${row.key}-food`} className="text-sm font-medium">
                    {category ?? "Comida"}
                  </label>
                  <Select
                    id={`${id}-${row.key}-food`}
                    name={`items.${index}.foodId`}
                    value={row.foodId}
                    onChange={(event) => update(row.key, { foodId: event.target.value })}
                    aria-invalid={error ? true : undefined}
                  >
                    <option value="">
                      {category ? `Elige (${category})` : "Elige una comida"}
                    </option>
                    {own.length > 0 ? (
                      <optgroup label={category}>
                        {own.map((food) => (
                          <option key={food.id} value={food.id}>
                            {food.name}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                    <FoodOptions
                      foods={foods.filter((f) => f.categoryId !== row.categoryId)}
                      categories={categories}
                    />
                  </Select>
                </div>
                <Input
                  name={`items.${index}.servings`}
                  inputMode="decimal"
                  value={row.servings}
                  onChange={(event) => update(row.key, { servings: event.target.value })}
                  aria-label={`Porciones de ${category ?? "la comida"}`}
                  className="w-20 text-right"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Quitar"
                  onClick={() => remove(row.key)}
                  disabled={rows.length === 1}
                >
                  <X className="size-4" />
                </Button>
              </div>
              {error ? <p className="text-danger text-xs">{error}</p> : null}
            </li>
          );
        })}
      </ul>
      {fieldError(state, "items") ? (
        <p className="text-danger text-xs">{fieldError(state, "items")}</p>
      ) : null}
      <div>
        <Button type="button" variant="secondary" size="sm" onClick={add}>
          <Plus className="size-4" aria-hidden />
          Agregar otra comida
        </Button>
      </div>
      <div className="flex gap-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <CancelButton />
      </div>
    </ActionForm>
  );
}

/**
 * "Marcar como comido" when the block was planned: confirm the plan with one
 * tap, or say what was eaten instead.
 */
export function EatPlannedForm({
  eatPlanned,
  eatOther,
  plan,
  foods,
  categories,
}: {
  eatPlanned: FormAction;
  eatOther: FormAction;
  plan: readonly MealItemInput[];
  foods: readonly Food[];
  categories: readonly FoodCategory[];
}) {
  const form = useFormAction(eatPlanned);
  const [other, setOther] = useState(false);
  const byId = new Map(foods.map((f) => [f.id, f]));
  if (other) {
    return (
      <MealItemsForm
        action={eatOther}
        rows={plan.map((item) => ({ ...item, categoryId: byId.get(item.foodId)?.categoryId }))}
        foods={foods}
        categories={categories}
        submitLabel="Marcar como comido"
      />
    );
  }
  return (
    <ActionForm form={form} className="flex flex-col gap-4">
      <FormAlert state={form.state} />
      <p className="text-muted text-sm">¿Comiste lo que habías planificado?</p>
      <ul className="border-border divide-border divide-y rounded-xs border">
        {plan.map((item) => {
          const food = byId.get(item.foodId);
          return (
            <li key={item.foodId} className="flex items-center gap-3 px-3 py-2 text-sm">
              <FoodIcon icon={food?.icon ?? null} className="text-muted size-4" />
              <span className="flex-1">{food?.name ?? "Comida"}</span>
              <span className="text-muted">{formatServings(item.servings)}</span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Marcando…">Sí, lo comí</SubmitButton>
        <Button type="button" variant="secondary" onClick={() => setOther(true)}>
          Comí otra cosa
        </Button>
      </div>
    </ActionForm>
  );
}
