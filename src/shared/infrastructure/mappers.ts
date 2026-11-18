import { assertMinorUnits, type LocalDate } from "@/shared/domain";

/** BIGINT column -> minor units as a safe JS integer. */
export function toMinor(value: bigint | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const minor = Number(value);
  assertMinorUnits(minor);
  return minor;
}

export function toMinorOrNull(value: bigint | null | undefined): number | null {
  return value === null || value === undefined ? null : toMinor(value);
}

export function toBigInt(minor: number): bigint {
  assertMinorUnits(minor);
  return BigInt(minor);
}

/** DATE columns are read by Prisma as UTC midnight. */
export function toLocalDate(value: Date): LocalDate {
  return value.toISOString().slice(0, 10) as LocalDate;
}

export function toLocalDateOrNull(value: Date | null): LocalDate | null {
  return value ? toLocalDate(value) : null;
}

export function toDbDate(date: LocalDate): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function toDbDateOrNull(date: LocalDate | null | undefined): Date | null {
  return date ? toDbDate(date) : null;
}
