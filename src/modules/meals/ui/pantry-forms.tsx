"use client";

import { useEffect, useId, useRef, useState } from "react";
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
import { type AmountUnit, type Food, type FoodCategory, UNITS_BY_MEASURE } from "../domain/food";
import { addStockAction, saveMealSettingsAction } from "./actions";
import { AMOUNT_UNIT_LABELS, editableNumber, formatServingSize } from "./format";
import type { MealSettings } from "../domain/settings";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

function unitsFor(food: Food | undefined): AmountUnit[] {
  return food ? ["servings", ...UNITS_BY_MEASURE[food.measure]] : ["servings"];
}

/** Foods grouped by category, for <select>. */
export function FoodOptions({
  foods,
  categories,
}: {
  foods: readonly Food[];
  categories: readonly FoodCategory[];
}) {
  return categories.map((category) => {
    const options = foods.filter((f) => f.categoryId === category.id);
    if (options.length === 0) return null;
    return (
      <optgroup key={category.id} label={category.name}>
        {options.map((food) => (
          <option key={food.id} value={food.id}>
            {food.name}
          </option>
        ))}
      </optgroup>
    );
  });
}

/** "Agregar a la despensa": what was bought, in servings or in the food's measure. */
export function AddStockForm({
  foods,
  categories,
  defaultFoodId,
}: {
  foods: readonly Food[];
  categories: readonly FoodCategory[];
  defaultFoodId?: string;
}) {
  const id = useId();
  const form = useFormAction(addStockAction);
  const { state } = form;
  const formRef = useRef<HTMLFormElement>(null);
  const [foodId, setFoodId] = useState(defaultFoodId ?? "");
  const food = foods.find((f) => f.id === foodId);
  const units = unitsFor(food);
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);
  return (
    <ActionForm ref={formRef} form={form} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <Field label="Comida" htmlFor={`${id}-food`} error={fieldError(state, "foodId")}>
        <Select
          id={`${id}-food`}
          name="foodId"
          required
          value={foodId}
          onChange={(event) => setFoodId(event.target.value)}
        >
          <option value="" disabled>
            Elige una comida
          </option>
          <FoodOptions foods={foods} categories={categories} />
        </Select>
      </Field>
      <Field
        label="Cantidad"
        htmlFor={`${id}-amount`}
        error={fieldError(state, "amount") ?? fieldError(state, "unit")}
        hint={food ? formatServingSize(food) : undefined}
      >
        <div className="flex gap-2">
          <Input
            id={`${id}-amount`}
            name="amount"
            inputMode="decimal"
            required
            placeholder="1"
            className="w-28"
          />
          {/* The key resets the choice when the food changes measure. */}
          <Select
            key={food?.measure ?? "none"}
            name="unit"
            aria-label="Unidad"
            defaultValue={units[1] ?? "servings"}
            className="flex-1"
          >
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {AMOUNT_UNIT_LABELS[unit]}
              </option>
            ))}
          </Select>
        </div>
      </Field>
      <div className="flex gap-2">
        <SubmitButton>Agregar</SubmitButton>
        <CancelButton />
      </div>
    </ActionForm>
  );
}

/** "Ajustar": what is left of one food, counted by hand. */
export function SetStockForm({ action, food }: { action: FormAction; food: Food }) {
  const id = useId();
  const form = useFormAction(action);
  const { state } = form;
  const units = unitsFor(food);
  const unit = units[1] ?? "servings";
  return (
    <ActionForm form={form} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <Field
        label="Hay en casa"
        htmlFor={`${id}-amount`}
        error={fieldError(state, "amount") ?? fieldError(state, "unit")}
        hint={`${formatServingSize(food)}. Pon 0 si se acabó.`}
      >
        <div className="flex gap-2">
          <Input
            id={`${id}-amount`}
            name="amount"
            inputMode="decimal"
            required
            defaultValue={editableNumber(food.stock)}
            className="w-28"
          />
          <Select name="unit" aria-label="Unidad" defaultValue={unit} className="flex-1">
            {units.map((value) => (
              <option key={value} value={value}>
                {AMOUNT_UNIT_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>
      </Field>
      <div className="flex gap-2">
        <SubmitButton>Guardar</SubmitButton>
        <CancelButton />
      </div>
    </ActionForm>
  );
}

/** Settings of the meals app: how many days the pantry must cover, and when to warn. */
export function MealSettingsForm({ settings }: { settings: MealSettings }) {
  const id = useId();
  const form = useFormAction(saveMealSettingsAction);
  const { state } = form;
  return (
    <ActionForm form={form} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <div className="grid gap-4 @md:grid-cols-2">
        <Field
          label="Avisar si la despensa no alcanza para"
          htmlFor={`${id}-days`}
          error={fieldError(state, "coverageDays")}
          hint="Días de bloques que debe cubrir lo que hay en casa."
        >
          <div className="flex items-center gap-2">
            <Input
              id={`${id}-days`}
              name="coverageDays"
              type="number"
              min={1}
              max={30}
              required
              defaultValue={settings.coverageDays}
              className="w-24"
            />
            <span className="text-muted text-sm">días</span>
          </div>
        </Field>
        <Field
          label="Hora del aviso de despensa"
          htmlFor={`${id}-time`}
          error={fieldError(state, "shortageAlertTime")}
          hint="Una notificación al día, desde esta hora."
        >
          <Input
            id={`${id}-time`}
            name="shortageAlertTime"
            type="time"
            required
            defaultValue={settings.shortageAlertTime}
            className="w-32"
          />
        </Field>
      </div>
      <div>
        <SubmitButton>Guardar</SubmitButton>
      </div>
    </ActionForm>
  );
}
