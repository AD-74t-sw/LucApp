"use client";

import { useState } from "react";
import {
  type ActionState,
  ColorDot,
  Field,
  FormAlert,
  ActionForm,
  useFormAction,
  Input,
  Select,
  SubmitButton,
  fieldError,
  CancelButton,
} from "@/shared/ui";
import {
  CATEGORY_COLORS,
  CATEGORY_KINDS,
  type Category,
  type CategoryKind,
} from "../domain/category";
import { ClassificationFields } from "./classification-fields";
import { CATEGORY_KIND_LABELS } from "./labels";

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  /** Top-level categories that can act as parents. */
  parents: readonly Category[];
  /** Present when editing. */
  category?: Category;
  defaultKind?: CategoryKind;
  /** Preselected parent when adding a subcategory from the list. */
  defaultParentId?: string;
};

export function CategoryForm({
  action,
  parents,
  category,
  defaultKind = "EXPENSE",
  defaultParentId,
}: Props) {
  const form = useFormAction(action);
  const { state } = form;
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? defaultKind);
  const [parentId, setParentId] = useState(category?.parentId ?? defaultParentId ?? "");
  const parentOptions = parents.filter((p) => p.kind === kind && p.id !== category?.id);
  const parent = parentOptions.find((p) => p.id === parentId);

  return (
    <ActionForm form={form} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <div className="grid gap-4 @md:grid-cols-2">
        <Field label="Nombre" htmlFor="name" error={fieldError(state, "name")}>
          <Input id="name" name="name" defaultValue={category?.name} required maxLength={60} />
        </Field>
        {category ? (
          <Field label="Tipo" htmlFor="kind-readonly" hint="El tipo no se puede cambiar.">
            <Input
              id="kind-readonly"
              value={CATEGORY_KIND_LABELS[category.kind]}
              disabled
              readOnly
            />
          </Field>
        ) : (
          <Field label="Tipo" htmlFor="kind" error={fieldError(state, "kind")}>
            <Select
              id="kind"
              name="kind"
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as CategoryKind);
                setParentId("");
              }}
            >
              {CATEGORY_KINDS.map((value) => (
                <option key={value} value={value}>
                  {CATEGORY_KIND_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field
          label="Categoría principal"
          htmlFor="parentId"
          error={fieldError(state, "parentId")}
          hint="Déjalo vacío para crear una categoría principal."
        >
          <Select
            id="parentId"
            name="parentId"
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
          >
            <option value="">Ninguna (categoría principal)</option>
            {parentOptions.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name}
              </option>
            ))}
          </Select>
        </Field>
        {parent ? (
          <Field label="Color" htmlFor="color-inherited">
            <div id="color-inherited" className="flex h-10 items-center gap-2">
              <ColorDot color={parent.color} className="size-6" />
              <span className="text-muted text-sm">Usa el color de {parent.name}.</span>
            </div>
          </Field>
        ) : (
          <Field label="Color" htmlFor="color" error={fieldError(state, "color")}>
            <div className="flex items-center gap-2">
              <Input
                id="color"
                name="color"
                type="color"
                defaultValue={category?.color ?? CATEGORY_COLORS[0]}
                className="h-10 w-16 p-1"
              />
              <span className="text-muted text-xs">Sus subcategorías usan este mismo color.</span>
            </div>
          </Field>
        )}
      </div>

      {kind === "EXPENSE" ? (
        <fieldset className="border-border flex flex-col gap-3 rounded-xs border p-4">
          <legend className="px-1 text-sm font-medium">Clasificación por defecto</legend>
          <p className="text-muted text-xs">
            Se aplica automáticamente a los gastos de esta categoría; puedes cambiarla en cada
            gasto. Si la dejas vacía, se usa la de la categoría principal.
          </p>
          <ClassificationFields
            costTypeName="defaultCostType"
            necessityName="defaultNecessity"
            defaultCostType={category?.defaultCostType}
            defaultNecessity={category?.defaultNecessity}
            emptyLabel="Sin definir"
          />
        </fieldset>
      ) : null}

      <div className="flex gap-2">
        <SubmitButton>{category ? "Guardar cambios" : "Crear categoría"}</SubmitButton>
        <CancelButton href="/categories" />
      </div>
    </ActionForm>
  );
}
