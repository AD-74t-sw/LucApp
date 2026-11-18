"use client";

import { useId, useState } from "react";
import {
  type ActionState,
  ActionForm,
  CancelButton,
  Field,
  FormAlert,
  Input,
  Select,
  SubmitButton,
  fieldError,
  useFormAction,
} from "@/shared/ui";
import type { Food, FoodCategory } from "../domain/food";
import { createFoodAction, createFoodCategoryAction } from "./actions";
import { FoodIconPicker } from "./food-icon-picker";
import { AMOUNT_UNIT_LABELS, servingSizeFields } from "./format";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

const SERVING_UNITS = ["g", "kg", "ml", "l", "pieces", "custom"] as const;
type ServingUnit = (typeof SERVING_UNITS)[number];

/** New category, or renaming one. */
export function FoodCategoryForm({
  action,
  category,
}: {
  action?: FormAction;
  category?: FoodCategory;
}) {
  const id = useId();
  const form = useFormAction(action ?? createFoodCategoryAction);
  const { state } = form;
  return (
    <ActionForm form={form} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <Field
        label="Nombre"
        htmlFor={`${id}-name`}
        error={fieldError(state, "name")}
        hint="Por ejemplo: Proteínas, Carbohidratos, Verduras, Lácteos."
      >
        <Input
          id={`${id}-name`}
          name="name"
          required
          maxLength={60}
          defaultValue={category?.name}
          autoComplete="off"
        />
      </Field>
      <div className="flex gap-2">
        <SubmitButton>{category ? "Guardar" : "Crear categoría"}</SubmitButton>
        <CancelButton />
      </div>
    </ActionForm>
  );
}

/** New food, or editing one: name, category, size of one serving and icon. */
export function FoodForm({
  action,
  food,
  categories,
  defaultCategoryId,
}: {
  action?: FormAction;
  food?: Food;
  categories: readonly FoodCategory[];
  defaultCategoryId?: string;
}) {
  const id = useId();
  const form = useFormAction(action ?? createFoodAction);
  const { state } = form;
  const size = food ? servingSizeFields(food) : { amount: "", unit: "g" as const, label: "" };
  const [unit, setUnit] = useState<ServingUnit>(size.unit);
  return (
    <ActionForm form={form} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <div className="grid gap-4 @md:grid-cols-2">
        <Field label="Nombre" htmlFor={`${id}-name`} error={fieldError(state, "name")}>
          <Input
            id={`${id}-name`}
            name="name"
            required
            maxLength={60}
            defaultValue={food?.name}
            placeholder="Pechuga de pollo, arroz, huevo…"
            autoComplete="off"
          />
        </Field>
        <Field label="Categoría" htmlFor={`${id}-category`} error={fieldError(state, "categoryId")}>
          <Select
            id={`${id}-category`}
            name="categoryId"
            required
            defaultValue={food?.categoryId ?? defaultCategoryId ?? ""}
          >
            <option value="" disabled>
              Elige una categoría
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Una porción es"
          htmlFor={`${id}-amount`}
          error={
            fieldError(state, "unitAmount") ??
            fieldError(state, "unit") ??
            fieldError(state, "unitLabel")
          }
          hint={
            unit === "custom"
              ? "Tu propia unidad: 1 porción = 1 taza, 2 rebanadas, 0,5 plato…"
              : food
                ? "Se aceptan decimales. Cambiar entre peso, volumen y unidades vacía lo que hay en la despensa."
                : "Lo que comes de una vez: 150 g de pollo, 1 huevo, 0,5 palta. Se aceptan decimales."
          }
          className="@md:col-span-2"
        >
          <div className="flex gap-2">
            <Input
              id={`${id}-amount`}
              name="unitAmount"
              inputMode="decimal"
              required
              defaultValue={size.amount}
              placeholder="150"
              className="w-28"
            />
            <Select
              name="unit"
              aria-label="Unidad"
              value={unit}
              onChange={(event) => setUnit(event.target.value as ServingUnit)}
              className="flex-1"
            >
              {SERVING_UNITS.map((value) => (
                <option key={value} value={value}>
                  {AMOUNT_UNIT_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          {unit === "custom" ? (
            <Input
              name="unitLabel"
              required
              maxLength={30}
              defaultValue={size.label}
              placeholder="taza, plato, rebanada…"
              aria-label="Nombre de tu unidad"
              autoComplete="off"
              className="mt-2"
            />
          ) : null}
        </Field>
      </div>
      <FoodIconPicker name="icon" defaultValue={food?.icon ?? null} />
      {fieldError(state, "icon") ? (
        <p className="text-danger text-xs">{fieldError(state, "icon")}</p>
      ) : null}
      <div className="flex gap-2">
        <SubmitButton>{food ? "Guardar cambios" : "Crear comida"}</SubmitButton>
        <CancelButton />
      </div>
    </ActionForm>
  );
}
