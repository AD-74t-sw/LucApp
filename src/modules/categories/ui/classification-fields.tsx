import { Field, Select } from "@/shared/ui";
import { COST_TYPES, NECESSITIES, type CostType, type Necessity } from "../domain/category";
import { COST_TYPE_LABELS, NECESSITY_LABELS } from "./labels";

/** "Fixed/variable" and "essential/discretionary" pickers shared by category and expense forms. */
export function ClassificationFields({
  costTypeName,
  necessityName,
  defaultCostType,
  defaultNecessity,
  emptyLabel,
  errors = {},
}: {
  costTypeName: string;
  necessityName: string;
  defaultCostType?: CostType | null;
  defaultNecessity?: Necessity | null;
  /** Label for the "no explicit value" option. */
  emptyLabel: string;
  errors?: { costType?: string | undefined; necessity?: string | undefined };
}) {
  return (
    <div className="grid gap-4 @md:grid-cols-2">
      <Field label="Tipo de gasto" htmlFor={costTypeName} error={errors.costType}>
        <Select id={costTypeName} name={costTypeName} defaultValue={defaultCostType ?? ""}>
          <option value="">{emptyLabel}</option>
          {COST_TYPES.map((value) => (
            <option key={value} value={value}>
              {COST_TYPE_LABELS[value]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Necesidad" htmlFor={necessityName} error={errors.necessity}>
        <Select id={necessityName} name={necessityName} defaultValue={defaultNecessity ?? ""}>
          <option value="">{emptyLabel}</option>
          {NECESSITIES.map((value) => (
            <option key={value} value={value}>
              {NECESSITY_LABELS[value]}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
