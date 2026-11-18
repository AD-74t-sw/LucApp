import { z } from "zod";
import {
  amount,
  choice,
  currency,
  localDate,
  optionalAmount,
  optionalId,
  optionalText,
  text,
} from "@/shared/application/fields";
import { REIMBURSEMENT_KINDS } from "../domain/reimbursement";

/** What the claim is about; editable at any point. */
export const claimSchema = z.object({
  kind: choice(REIMBURSEMENT_KINDS),
  provider: text(80),
  description: text(120),
  requestedOn: localDate(),
  /** Rough amount while it is being reviewed (optional). */
  estimatedAmount: optionalAmount(),
  note: optionalText(300),
});
export type ClaimInput = z.infer<typeof claimSchema>;

export const newClaimSchema = claimSchema.extend({ currency: currency() });
export type NewClaimInput = z.infer<typeof newClaimSchema>;

/** The payer confirmed the amount and when it will be paid. */
export const approvalSchema = z.object({
  amount: amount(),
  expectedFrom: localDate(),
  expectedTo: localDate(),
});
export type ApprovalInput = z.infer<typeof approvalSchema>;

/** The money arrived; optionally recorded as income on an account. */
export const receiptSchema = z.object({
  amount: amount(),
  date: localDate(),
  accountId: optionalId(),
  categoryId: optionalId(),
});
export type ReceiptInput = z.infer<typeof receiptSchema>;
