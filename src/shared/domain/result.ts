/**
 * Expected failures (validation, not found, conflicts) are returned as values,
 * not thrown. Exceptions are reserved for bugs and infrastructure failures.
 */

export type DomainErrorCode = "VALIDATION" | "NOT_FOUND" | "CONFLICT";

export type DomainError = Readonly<{
  code: DomainErrorCode;
  /** User-facing message (Spanish). */
  message: string;
  /** Form field the error refers to, when there is one. */
  field?: string;
}>;

export type Result<T, E = DomainError> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never>;
export function ok(): Result<void, never>;
export function ok<T>(value?: T): Result<T | undefined, never> {
  return { ok: true, value };
}

export function fail(code: DomainErrorCode, message: string, field?: string): Result<never> {
  return { ok: false, error: field ? { code, message, field } : { code, message } };
}

/** Attaches a form field to a failed result (no-op for successes). */
export function withField<T>(result: Result<T>, field: string): Result<T> {
  return result.ok ? result : { ok: false, error: { ...result.error, field } };
}

export const validationError = (message: string, field?: string) =>
  fail("VALIDATION", message, field);

export const notFound = (what: string) => fail("NOT_FOUND", `${what} no existe o no te pertenece.`);

export const conflict = (message: string, field?: string) => fail("CONFLICT", message, field);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a syntactically valid UUID (used to reject bad ids in URLs before querying). */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
