import type { Db } from "@/shared/infrastructure";
import { transactionRepository } from "../infrastructure/transaction-repository";

/**
 * Removes a movement that another module recorded and keeps a link to (for
 * example the income of a reimbursement), when that record is undone.
 */
export async function deleteLinkedMovement(
  userId: string,
  transactionId: string,
  db?: Db,
): Promise<void> {
  await transactionRepository.delete(userId, transactionId, db);
}
