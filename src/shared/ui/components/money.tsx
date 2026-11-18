import type { CurrencyCode } from "@/shared/domain";
import { cn } from "../cn";
import { formatMoney } from "../format";

/** Renders an amount with tabular digits; `colored` paints positives purple and negatives orange. */
export function MoneyText({
  amount,
  currency,
  colored = false,
  signed = false,
  className,
}: {
  amount: number;
  currency: CurrencyCode;
  colored?: boolean;
  signed?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "tabular whitespace-nowrap",
        colored && amount > 0 && "text-positive",
        colored && amount < 0 && "text-negative",
        className,
      )}
    >
      {formatMoney(amount, currency, { signDisplay: signed ? "exceptZero" : "auto" })}
    </span>
  );
}
