import {
  type CurrencyCode,
  type LocalDate,
  type Result,
  ok,
  validationError,
} from "@/shared/domain";

export const REIMBURSEMENT_KINDS = [
  "HEALTH_PLAN",
  "SUPPLEMENTARY_INSURANCE",
  "INSURANCE",
  "TAX",
  "PURCHASE",
  "OTHER",
] as const;
export type ReimbursementKind = (typeof REIMBURSEMENT_KINDS)[number];

/**
 * Life cycle: IN_REVIEW (amount unknown) -> APPROVED (amount and payment window)
 * -> RECEIVED. A claim can also be REJECTED, and money can arrive without a
 * previous approval notice (IN_REVIEW -> RECEIVED).
 */
export const REIMBURSEMENT_STATUSES = ["IN_REVIEW", "APPROVED", "RECEIVED", "REJECTED"] as const;
export type ReimbursementStatus = (typeof REIMBURSEMENT_STATUSES)[number];

export type Reimbursement = Readonly<{
  id: string;
  kind: ReimbursementKind;
  provider: string;
  description: string;
  currency: CurrencyCode;
  requestedOn: LocalDate;
  /** Rough amount while in review, if known. */
  estimatedAmount: number | null;
  status: ReimbursementStatus;
  /** Approved amount. */
  amount: number | null;
  expectedFrom: LocalDate | null;
  expectedTo: LocalDate | null;
  receivedOn: LocalDate | null;
  receivedAmount: number | null;
  note: string | null;
  /** Income movement registered when the money arrived. */
  transactionId: string | null;
}>;

export function isOpen(r: Pick<Reimbursement, "status">): boolean {
  return r.status === "IN_REVIEW" || r.status === "APPROVED";
}

/** Where an approved reimbursement stands against its payment window. */
export type Arrival = "UPCOMING" | "IN_WINDOW" | "LATE";

export function arrivalOf(
  r: Pick<Reimbursement, "status" | "expectedFrom" | "expectedTo">,
  today: LocalDate,
): Arrival | null {
  if (r.status !== "APPROVED" || !r.expectedFrom || !r.expectedTo) return null;
  if (today > r.expectedTo) return "LATE";
  if (today >= r.expectedFrom) return "IN_WINDOW";
  return "UPCOMING";
}

export function validateApproval(
  amount: number,
  expectedFrom: LocalDate,
  expectedTo: LocalDate,
): Result<void> {
  if (amount <= 0) return validationError("El monto debe ser mayor que cero.", "amount");
  if (expectedTo < expectedFrom) {
    return validationError("La fecha final no puede ser anterior a la inicial.", "expectedTo");
  }
  return ok();
}

export function canApprove(r: Pick<Reimbursement, "status">): Result<void> {
  return isOpen(r) ? ok() : validationError("Esta devolución ya está cerrada.");
}

export function canReceive(r: Pick<Reimbursement, "status">): Result<void> {
  return isOpen(r) ? ok() : validationError("Esta devolución ya está cerrada.");
}

/** Undoing "received" or "rejected" goes back to where it was before. */
export function reopenedStatus(r: Pick<Reimbursement, "amount">): ReimbursementStatus {
  return r.amount === null ? "IN_REVIEW" : "APPROVED";
}

export type ReimbursementTotals = Readonly<{
  currency: CurrencyCode;
  /** Approved and not received yet. */
  approved: number;
  approvedCount: number;
  /** Estimated amounts of claims in review (those that have one). */
  estimated: number;
  inReviewCount: number;
  lateCount: number;
}>;

/** Open reimbursements per currency (amounts in different currencies are never added). */
export function totalsByCurrency(
  list: readonly Reimbursement[],
  today: LocalDate,
): ReimbursementTotals[] {
  const totals = new Map<CurrencyCode, ReimbursementTotals>();
  for (const r of list) {
    if (!isOpen(r)) continue;
    const t = totals.get(r.currency) ?? {
      currency: r.currency,
      approved: 0,
      approvedCount: 0,
      estimated: 0,
      inReviewCount: 0,
      lateCount: 0,
    };
    totals.set(
      r.currency,
      r.status === "APPROVED"
        ? {
            ...t,
            approved: t.approved + (r.amount ?? 0),
            approvedCount: t.approvedCount + 1,
            lateCount: t.lateCount + (arrivalOf(r, today) === "LATE" ? 1 : 0),
          }
        : {
            ...t,
            estimated: t.estimated + (r.estimatedAmount ?? 0),
            inReviewCount: t.inReviewCount + 1,
          },
    );
  }
  return [...totals.values()];
}

/** Open first (late and soonest first), then the history, newest first. */
export function sortForDisplay<T extends Reimbursement>(list: readonly T[]): T[] {
  const openKey = (r: T) => r.expectedTo ?? r.requestedOn;
  const closedKey = (r: T) => r.receivedOn ?? r.requestedOn;
  return [...list].sort((a, b) => {
    if (isOpen(a) !== isOpen(b)) return isOpen(a) ? -1 : 1;
    if (isOpen(a)) return openKey(a).localeCompare(openKey(b));
    return closedKey(b).localeCompare(closedKey(a));
  });
}
