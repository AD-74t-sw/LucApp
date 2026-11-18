"use client";

import { useId } from "react";
import {
  type ActionState,
  ActionForm,
  CancelButton,
  Checkbox,
  Field,
  FormAlert,
  Input,
  SubmitButton,
  fieldError,
  useFormAction,
} from "@/shared/ui";
import { MAX_SERVINGS, type MealBlock } from "../domain/block";
import type { FoodCategory } from "../domain/food";
import { createBlockAction } from "./actions";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/** A block: name, time range, notification, and servings of each category. */
export function BlockForm({
  action,
  block,
  categories,
}: {
  action?: FormAction;
  block?: MealBlock;
  categories: readonly FoodCategory[];
}) {
  const id = useId();
  const form = useFormAction(action ?? createBlockAction);
  const { state } = form;
  const servings = new Map(block?.portions.map((p) => [p.categoryId, p.servings]));
  return (
    <ActionForm form={form} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <div className="grid gap-4 @md:grid-cols-2">
        <Field
          label="Nombre"
          htmlFor={`${id}-name`}
          error={fieldError(state, "name")}
          className="@md:col-span-2"
        >
          <Input
            id={`${id}-name`}
            name="name"
            required
            maxLength={60}
            defaultValue={block?.name}
            placeholder="Desayuno, almuerzo, once, cena…"
            autoComplete="off"
          />
        </Field>
        <Field label="Desde" htmlFor={`${id}-start`} error={fieldError(state, "startTime")}>
          <Input
            id={`${id}-start`}
            name="startTime"
            type="time"
            required
            defaultValue={block?.startTime}
          />
        </Field>
        <Field label="Hasta" htmlFor={`${id}-end`} error={fieldError(state, "endTime")}>
          <Input
            id={`${id}-end`}
            name="endTime"
            type="time"
            required
            defaultValue={block?.endTime}
          />
        </Field>
      </div>
      <Checkbox
        name="notify"
        label="Avisarme cuando empiece"
        defaultChecked={block?.notify ?? true}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Porciones por categoría</legend>
        <p className="text-muted text-xs">
          Deja en blanco las categorías que no van en este bloque.
        </p>
        {categories.length === 0 ? (
          <p className="text-muted text-sm">Primero crea categorías en el catálogo.</p>
        ) : (
          <div className="grid gap-2 @md:grid-cols-2">
            {categories.map((category) => (
              <label
                key={category.id}
                className="border-border flex items-center justify-between gap-3 rounded-xs border px-3 py-1.5 text-sm"
              >
                <span className="min-w-0 truncate">{category.name}</span>
                <Input
                  name={`servings.${category.id}`}
                  type="number"
                  min={0}
                  max={MAX_SERVINGS}
                  step={1}
                  inputMode="numeric"
                  defaultValue={servings.get(category.id) ?? ""}
                  aria-label={`Porciones de ${category.name}`}
                  className="h-8 w-20 text-right"
                />
              </label>
            ))}
          </div>
        )}
        {fieldError(state, "portions") ? (
          <p className="text-danger text-xs">{fieldError(state, "portions")}</p>
        ) : null}
      </fieldset>
      <div className="flex gap-2">
        <SubmitButton>{block ? "Guardar cambios" : "Crear bloque"}</SubmitButton>
        <CancelButton />
      </div>
    </ActionForm>
  );
}
