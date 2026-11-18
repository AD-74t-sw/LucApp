import type { LocalDate } from "@/shared/domain";

/** A charge on a credit card in a foreign currency (positive, in its minor units). */
export type ForeignCharge = Readonly<{ id: string; date: LocalDate; amount: number }>;

/**
 * A payment that lowered that foreign debt (positive, foreign minor units).
 * `baseAmount` is what it actually cost in the base currency (e.g. the pesos the
 * bank charged); null when unknown, then it is valued at that day's rate.
 */
export type ForeignPayment = Readonly<{
  date: LocalDate;
  amount: number;
  baseAmount: number | null;
}>;

/** Converts a foreign amount into the base currency on a date; null if no rate is known. */
export type Converter = (amount: number, date: LocalDate) => number | null;

/**
 * Values each foreign-currency charge of one credit card in the base currency.
 *
 * Payments settle the oldest debt first: the opening debt, then charges in
 * order. The settled part of a charge is worth what was actually paid for it;
 * the part still owed is worth today's rate ("the real rate until it is paid").
 * Returns null for a charge when a needed rate is unknown.
 */
export function valueCardCharges(input: {
  openingDebt: number;
  charges: readonly ForeignCharge[];
  payments: readonly ForeignPayment[];
  convert: Converter;
  today: LocalDate;
}): Map<string, number | null> {
  const queue = [...input.payments]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((payment) => {
      const base = payment.baseAmount ?? input.convert(payment.amount, payment.date);
      return {
        remaining: payment.amount,
        perUnit: base === null || payment.amount === 0 ? null : base / payment.amount,
      };
    });

  /** Takes up to `amount` from the oldest payments; returns the covered value. */
  const settle = (amount: number): { left: number; value: number; unknown: boolean } => {
    let left = amount;
    let value = 0;
    let unknown = false;
    while (left > 0 && queue.length > 0) {
      const payment = queue[0]!;
      const take = Math.min(left, payment.remaining);
      if (payment.perUnit === null) unknown = true;
      else value += take * payment.perUnit;
      payment.remaining -= take;
      left -= take;
      if (payment.remaining === 0) queue.shift();
    }
    return { left, value, unknown };
  };

  settle(Math.max(0, input.openingDebt));

  const result = new Map<string, number | null>();
  const charges = [...input.charges].sort((a, b) => a.date.localeCompare(b.date));
  for (const charge of charges) {
    const settled = settle(charge.amount);
    const pending = settled.left > 0 ? input.convert(settled.left, input.today) : 0;
    result.set(
      charge.id,
      settled.unknown || pending === null ? null : Math.round(settled.value + pending),
    );
  }
  return result;
}
