import type { z } from "zod";
import type { DomainError, Result } from "@/shared/domain";
import type { ActionState, FieldErrors } from "../action-state";

/** Validates a submitted form against a use-case input schema. */
export function parseForm<S extends z.ZodType>(
  schema: S,
  formData: FormData,
): Result<z.output<S>, ActionState> {
  const raw: Record<string, FormDataEntryValue> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("$ACTION")) raw[key] = value;
  }
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };

  const fieldErrors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path.join(".");
    fieldErrors[field] ??= issue.message;
  }
  return {
    ok: false,
    error: { status: "error", message: "Revisa los campos marcados.", fieldErrors },
  };
}

/**
 * Rows of a repeated group of fields, named `<prefix>.<index>.<field>`
 * ("items.0.foodId", "items.0.servings"…). Rows come back in index order and
 * rows whose fields are all empty are dropped (a blank row the person added).
 * `parseForm` ignores these keys' structure, so validate the rows with their
 * own schema (usually `z.array(...)`).
 */
export function formRows(formData: FormData, prefix: string): Record<string, string>[] {
  const rows = new Map<number, Record<string, string>>();
  const pattern = new RegExp(`^${prefix}\\.(\\d+)\\.(\\w+)$`);
  for (const [key, value] of formData.entries()) {
    const match = pattern.exec(key);
    if (!match || typeof value !== "string") continue;
    const index = Number(match[1]);
    const row = rows.get(index) ?? {};
    row[match[2] as string] = value;
    rows.set(index, row);
  }
  return [...rows.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, row]) => row)
    .filter((row) => Object.values(row).some((value) => value.trim() !== ""));
}

export function errorState(error: DomainError): ActionState {
  return {
    status: "error",
    message: error.message,
    fieldErrors: error.field ? { [error.field]: error.message } : {},
  };
}

export function successState(message: string): ActionState {
  return { status: "success", message };
}
