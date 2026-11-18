import { getAccount } from "@/modules/accounts";
import { deleteLinkedMovement, recordIncome } from "@/modules/transactions";
import {
  type CurrencyCode,
  type Result,
  notFound,
  ok,
  parseAmount,
  validationError,
  withField,
} from "@/shared/domain";
import { runInTransaction } from "@/shared/infrastructure";
import {
  type Reimbursement,
  canApprove,
  canReceive,
  isOpen,
  reopenedStatus,
  validateApproval,
} from "../domain/reimbursement";
import {
  type ClaimDetails,
  reimbursementRepository,
} from "../infrastructure/reimbursement-repository";
import type {
  ApprovalInput,
  ClaimInput,
  NewClaimInput,
  ReceiptInput,
} from "./reimbursement-schemas";

function parsePositive(input: string, currency: CurrencyCode, field: string): Result<number> {
  const parsed = withField(parseAmount(input, currency), field);
  if (!parsed.ok) return parsed;
  if (parsed.value <= 0) return validationError("El monto debe ser mayor que cero.", field);
  return parsed;
}

function buildDetails(input: ClaimInput, currency: CurrencyCode): Result<ClaimDetails> {
  let estimatedAmount: number | null = null;
  if (input.estimatedAmount) {
    const parsed = parsePositive(input.estimatedAmount, currency, "estimatedAmount");
    if (!parsed.ok) return parsed;
    estimatedAmount = parsed.value;
  }
  return ok({
    kind: input.kind,
    provider: input.provider,
    description: input.description,
    requestedOn: input.requestedOn,
    estimatedAmount,
    note: input.note ?? null,
  });
}

async function load(userId: string, id: string): Promise<Result<Reimbursement>> {
  const found = await reimbursementRepository.findById(userId, id);
  return found ? ok(found) : notFound("La devolución");
}

/** A claim that was just submitted: its amount is not known yet. */
export async function createReimbursement(
  userId: string,
  input: NewClaimInput,
): Promise<Result<{ id: string }>> {
  const details = buildDetails(input, input.currency);
  if (!details.ok) return details;
  const id = await reimbursementRepository.create(userId, {
    ...details.value,
    currency: input.currency,
  });
  return ok({ id });
}

export async function updateReimbursement(
  userId: string,
  id: string,
  input: ClaimInput,
): Promise<Result<void>> {
  const found = await load(userId, id);
  if (!found.ok) return found;
  const details = buildDetails(input, found.value.currency);
  if (!details.ok) return details;
  await reimbursementRepository.updateDetails(userId, id, details.value);
  return ok();
}

/** Sets (or corrects) the approved amount and the window in which it will be paid. */
export async function approveReimbursement(
  userId: string,
  id: string,
  input: ApprovalInput,
): Promise<Result<void>> {
  const found = await load(userId, id);
  if (!found.ok) return found;
  const allowed = canApprove(found.value);
  if (!allowed.ok) return allowed;
  const amount = parsePositive(input.amount, found.value.currency, "amount");
  if (!amount.ok) return amount;
  const valid = validateApproval(amount.value, input.expectedFrom, input.expectedTo);
  if (!valid.ok) return valid;
  await reimbursementRepository.setProgress(userId, id, {
    status: "APPROVED",
    amount: amount.value,
    expectedFrom: input.expectedFrom,
    expectedTo: input.expectedTo,
  });
  return ok();
}

/**
 * The money arrived. With an account, it is also recorded there as income (in
 * the chosen income category) so the balance matches the bank.
 */
export async function markReceived(
  userId: string,
  id: string,
  input: ReceiptInput,
): Promise<Result<void>> {
  const found = await load(userId, id);
  if (!found.ok) return found;
  const claim = found.value;
  const allowed = canReceive(claim);
  if (!allowed.ok) return allowed;
  const amount = parsePositive(input.amount, claim.currency, "amount");
  if (!amount.ok) return amount;

  if (input.accountId) {
    const account = await getAccount(userId, input.accountId);
    if (!account) return withField(notFound("La cuenta"), "accountId");
    if (account.currency !== claim.currency && account.secondaryCurrency !== claim.currency) {
      return validationError(
        `La cuenta está en ${account.currency}; la devolución está en ${claim.currency}.`,
        "accountId",
      );
    }
    if (!input.categoryId) {
      return validationError("Elige la categoría del ingreso.", "categoryId");
    }
  }

  return runInTransaction(async (tx) => {
    let transactionId: string | null = null;
    if (input.accountId && input.categoryId) {
      const income = await recordIncome(
        userId,
        {
          accountId: input.accountId,
          categoryId: input.categoryId,
          amount: input.amount,
          currency: claim.currency,
          date: input.date,
          description: `Devolución ${claim.provider}: ${claim.description}`,
        },
        tx,
      );
      if (!income.ok) return income;
      transactionId = income.value.id;
    }
    await reimbursementRepository.setProgress(
      userId,
      id,
      {
        status: "RECEIVED",
        receivedOn: input.date,
        receivedAmount: amount.value,
        transactionId,
      },
      tx,
    );
    return ok();
  });
}

export async function rejectReimbursement(userId: string, id: string): Promise<Result<void>> {
  const found = await load(userId, id);
  if (!found.ok) return found;
  if (!isOpen(found.value)) return validationError("Esta devolución ya está cerrada.");
  await reimbursementRepository.setProgress(userId, id, { status: "REJECTED" });
  return ok();
}

/**
 * Undoes "received" or "rejected" (a mistake, or an appeal): the claim goes back
 * to approved or in review, and the income movement it created is removed.
 */
export async function reopenReimbursement(userId: string, id: string): Promise<Result<void>> {
  const found = await load(userId, id);
  if (!found.ok) return found;
  const claim = found.value;
  if (isOpen(claim)) return ok();
  await runInTransaction(async (tx) => {
    if (claim.transactionId) await deleteLinkedMovement(userId, claim.transactionId, tx);
    await reimbursementRepository.setProgress(
      userId,
      id,
      {
        status: reopenedStatus(claim),
        receivedOn: null,
        receivedAmount: null,
        transactionId: null,
      },
      tx,
    );
  });
  return ok();
}

/** Deletes the claim and the income movement it created, if any. */
export async function deleteReimbursement(userId: string, id: string): Promise<Result<void>> {
  const found = await load(userId, id);
  if (!found.ok) return found;
  await runInTransaction(async (tx) => {
    if (found.value.transactionId) {
      await deleteLinkedMovement(userId, found.value.transactionId, tx);
    }
    await reimbursementRepository.delete(userId, id, tx);
  });
  return ok();
}
