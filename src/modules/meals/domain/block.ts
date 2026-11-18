import { type LocalTime, type Result, ok, validationError } from "@/shared/domain";

/** Servings of a food category a block asks for. */
export type BlockPortion = Readonly<{ categoryId: string; servings: number }>;

/** A meal of the day ("Almuerzo", 13:00–14:00). Blocks repeat every day. */
export type MealBlock = Readonly<{
  id: string;
  name: string;
  startTime: LocalTime;
  endTime: LocalTime;
  notify: boolean;
  archived: boolean;
  portions: readonly BlockPortion[];
}>;

export const MAX_SERVINGS = 50;

export const SERVINGS_RANGE = `Las porciones deben ser mayores que 0 y hasta ${MAX_SERVINGS} (se aceptan decimales).`;

/** Servings can be fractional (half a serving), but never zero or negative. */
export function isValidServings(servings: number): boolean {
  return Number.isFinite(servings) && servings > 0 && servings <= MAX_SERVINGS;
}

export function validateBlock(input: {
  startTime: LocalTime;
  endTime: LocalTime;
  portions: readonly BlockPortion[];
}): Result<void> {
  if (input.endTime <= input.startTime) {
    return validationError(
      "La hora de término debe ser después del inicio (un bloque no cruza la medianoche).",
      "endTime",
    );
  }
  if (input.portions.length === 0) {
    return validationError(
      "Indica cuántas porciones pide el bloque de al menos una categoría.",
      "portions",
    );
  }
  if (input.portions.some((p) => !isValidServings(p.servings))) {
    return validationError(SERVINGS_RANGE, "portions");
  }
  if (new Set(input.portions.map((p) => p.categoryId)).size !== input.portions.length) {
    return validationError("Cada categoría va una sola vez.", "portions");
  }
  return ok();
}

/** Blocks in the order of the day. */
export function sortBlocks<T extends Pick<MealBlock, "startTime" | "name">>(blocks: readonly T[]) {
  return [...blocks].sort(
    (a, b) => a.startTime.localeCompare(b.startTime) || a.name.localeCompare(b.name, "es"),
  );
}

/** True while the block is going on (start included, end excluded). */
export function isActiveAt(block: Pick<MealBlock, "startTime" | "endTime">, time: LocalTime) {
  return block.startTime <= time && time < block.endTime;
}
