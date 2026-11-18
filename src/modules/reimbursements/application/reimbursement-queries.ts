import type { LocalDate } from "@/shared/domain";
import {
  type Reimbursement,
  type ReimbursementTotals,
  sortForDisplay,
  totalsByCurrency,
} from "../domain/reimbursement";
import { reimbursementRepository } from "../infrastructure/reimbursement-repository";

/** Every claim: open ones first (soonest due first), then the history. */
export async function listReimbursements(userId: string): Promise<Reimbursement[]> {
  return sortForDisplay(await reimbursementRepository.list(userId));
}

/** Money expected back, per currency (for the summary and the page header). */
export async function getReimbursementTotals(
  userId: string,
  today: LocalDate,
): Promise<ReimbursementTotals[]> {
  return totalsByCurrency(await reimbursementRepository.listOpen(userId), today);
}
