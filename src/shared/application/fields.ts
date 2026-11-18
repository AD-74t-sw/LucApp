import { z } from "zod";
import {
  CURRENCY_CODES,
  isLocalDate,
  isLocalTime,
  type LocalDate,
  type LocalTime,
} from "@/shared/domain";

/**
 * Zod building blocks for use-case inputs. They accept the raw strings that
 * HTML forms send (empty string = not provided) and produce typed values.
 */

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const text = (max = 120) =>
  z
    .string({ error: "Campo obligatorio." })
    .trim()
    .min(1, "Campo obligatorio.")
    .max(max, `Máximo ${max} caracteres.`);

export const optionalText = (max = 500) =>
  z.preprocess(
    emptyToUndefined,
    z.string().trim().max(max, `Máximo ${max} caracteres.`).optional(),
  );

export const id = (message = "Selecciona una opción.") => z.uuid({ error: message });

export const optionalId = () =>
  z.preprocess(emptyToUndefined, z.uuid({ error: "Opción inválida." }).optional());

export const localDate = () =>
  z
    .string({ error: "Ingresa una fecha." })
    .refine(isLocalDate, "Fecha inválida.")
    .transform((value) => value as LocalDate);

export const optionalLocalDate = () =>
  z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine(isLocalDate, "Fecha inválida.")
      .transform((value) => value as LocalDate)
      .optional(),
  );

/** Time of day as sent by <input type="time"> ("HH:MM"). */
export const localTime = () =>
  z
    .string({ error: "Ingresa una hora." })
    .trim()
    .min(1, "Ingresa una hora.")
    // Some browsers send seconds ("13:00:00").
    .transform((value) => value.slice(0, 5))
    .refine(isLocalTime, "Hora inválida.")
    .transform((value) => value as LocalTime);

export const currency = () => z.enum(CURRENCY_CODES, { error: "Moneda no soportada." });

export const optionalCurrency = () => z.preprocess(emptyToUndefined, currency().optional());

/** Decimal amount as typed by the user; parsed into minor units by the use case. */
export const amount = () =>
  z.string({ error: "Ingresa un monto." }).trim().min(1, "Ingresa un monto.");

export const optionalAmount = () => z.preprocess(emptyToUndefined, z.string().trim().optional());

export const integer = (min: number, max: number) =>
  z.coerce
    .number({ error: "Debe ser un número." })
    .int("Debe ser un número entero.")
    .min(min, `Mínimo ${min}.`)
    .max(max, `Máximo ${max}.`);

export const optionalInteger = (min: number, max: number) =>
  z.preprocess(emptyToUndefined, integer(min, max).optional());

export const choice = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values, { error: "Selecciona una opción válida." });

export const optionalChoice = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(emptyToUndefined, z.enum(values, { error: "Opción inválida." }).optional());

export const checkbox = () =>
  z.preprocess((value) => value === "on" || value === "true", z.boolean());
