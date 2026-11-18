import type { CurrencyCode } from "@/shared/domain";

export type BalanceAmounts = Readonly<{
  /** Opening balance + movements dated today or earlier. */
  posted: number;
  /** Sum of future-dated movements (e.g. upcoming installments). */
  scheduled: number;
}>;

/**
 * Balance of an account in its own currency (`posted`/`scheduled`), plus the
 * international debt of a dual-currency credit card (`secondary`).
 */
export type AccountBalance = BalanceAmounts &
  Readonly<{
    accountId: string;
    currency: CurrencyCode;
    secondary: (BalanceAmounts & { currency: CurrencyCode }) | null;
  }>;
