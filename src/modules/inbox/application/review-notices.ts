import {
  type ExpenseInput,
  type IncomeInput,
  type TransferInput,
  recordExpense,
  recordIncome,
  recordTransfer,
} from "@/modules/transactions";
import { type Result, conflict, notFound, ok } from "@/shared/domain";
import { type Db, runInTransaction } from "@/shared/infrastructure";
import { isTransferPair } from "../domain/own-transfer";
import { merchantKey } from "../domain/text";
import { walletCardKey } from "../domain/wallet";
import { type NoticeWithCopies, noticeRepository } from "../infrastructure/notice-repository";
import { ruleRepository } from "../infrastructure/rule-repository";

type Recorded = { recorded: number };

async function loadPending(userId: string, id: string, db: Db): Promise<Result<NoticeWithCopies>> {
  const notice = await noticeRepository.findById(userId, id, db);
  if (!notice) return notFound("El aviso");
  if (notice.status !== "PENDING") return conflict("Este aviso ya fue revisado.");
  return ok(notice);
}

/**
 * Records a notice as an expense and remembers the choice for its merchant.
 * The movement and the notice's new status are saved together.
 */
export function recordNoticeAsExpense(
  userId: string,
  noticeId: string,
  input: ExpenseInput,
): Promise<Result<Recorded>> {
  return runInTransaction(async (tx) => {
    const notice = await loadPending(userId, noticeId, tx);
    if (!notice.ok) return notice;
    const movement = await recordExpense(userId, input, tx);
    if (!movement.ok) return movement;
    await noticeRepository.setStatus(
      userId,
      [noticeId],
      { status: "RECORDED", transactionId: movement.value.id },
      tx,
    );
    await remember(
      userId,
      notice.value,
      {
        kind: "EXPENSE",
        categoryId: input.categoryId,
        accountId: input.accountId,
        cardId: input.cardId ?? null,
        toAccountId: null,
      },
      tx,
    );
    return ok({ recorded: 1 });
  });
}

export function recordNoticeAsIncome(
  userId: string,
  noticeId: string,
  input: IncomeInput,
): Promise<Result<Recorded>> {
  return runInTransaction(async (tx) => {
    const notice = await loadPending(userId, noticeId, tx);
    if (!notice.ok) return notice;
    const movement = await recordIncome(userId, input, tx);
    if (!movement.ok) return movement;
    await noticeRepository.setStatus(
      userId,
      [noticeId],
      { status: "RECORDED", transactionId: movement.value.id },
      tx,
    );
    await remember(
      userId,
      notice.value,
      {
        kind: "INCOME",
        categoryId: input.categoryId,
        accountId: input.accountId,
        cardId: null,
        toAccountId: null,
      },
      tx,
    );
    return ok({ recorded: 1 });
  });
}

/**
 * Records a notice as a transfer between own accounts. When the other leg's
 * notice (money arriving at the other bank) is given, it is closed too, so the
 * transfer is not recorded twice.
 */
export function recordNoticeAsTransfer(
  userId: string,
  noticeId: string,
  input: TransferInput,
  pairedNoticeId: string | null,
  timeZone: string,
): Promise<Result<Recorded>> {
  return runInTransaction(async (tx) => {
    const notice = await loadPending(userId, noticeId, tx);
    if (!notice.ok) return notice;
    const ids = [noticeId];
    if (pairedNoticeId && pairedNoticeId !== noticeId) {
      const paired = await loadPending(userId, pairedNoticeId, tx);
      const legs = paired.ok
        ? isTransferPair(notice.value, paired.value, timeZone) ||
          isTransferPair(paired.value, notice.value, timeZone)
        : false;
      if (paired.ok && legs) ids.push(pairedNoticeId);
    }
    const transfer = await recordTransfer(userId, input, tx);
    if (!transfer.ok) return transfer;
    await noticeRepository.setStatus(
      userId,
      ids,
      { status: "RECORDED", transferGroupId: transfer.value.transferGroupId },
      tx,
    );
    await remember(
      userId,
      notice.value,
      {
        kind: "TRANSFER",
        categoryId: null,
        accountId: input.fromAccountId,
        cardId: null,
        toAccountId: input.toAccountId,
      },
      tx,
    );
    return ok({ recorded: ids.length });
  });
}

/** Not a movement worth recording (a refund already counted, a promo, a login alert…). */
export async function dismissNotice(userId: string, id: string): Promise<Result<void>> {
  const notice = await noticeRepository.findById(userId, id);
  if (!notice) return notFound("El aviso");
  if (notice.status !== "PENDING") return conflict("Este aviso ya fue revisado.");
  await noticeRepository.setStatus(userId, [id], { status: "DISMISSED" });
  return ok();
}

/**
 * Back to the inbox: a dismissed notice, or one wrongly merged as a copy of
 * another (e.g. two equal purchases that really were two).
 */
export async function restoreNotice(userId: string, id: string): Promise<Result<void>> {
  const notice = await noticeRepository.findById(userId, id);
  if (!notice) return notFound("El aviso");
  if (notice.status !== "DISMISSED" && notice.status !== "DUPLICATE") {
    return conflict("Solo puedes devolver avisos descartados o unidos a otro.");
  }
  await noticeRepository.setStatus(userId, [id], { status: "PENDING", duplicateOfId: null });
  return ok();
}

/**
 * Remembers the choice for next time: by merchant (category, account) and, for
 * Apple Pay payments, which account and card a Wallet card belongs to.
 */
async function remember(
  userId: string,
  notice: NoticeWithCopies,
  choice: {
    kind: "EXPENSE" | "INCOME" | "TRANSFER";
    categoryId: string | null;
    accountId: string | null;
    cardId: string | null;
    toAccountId: string | null;
  },
  db: Db,
): Promise<void> {
  const key = merchantKey(notice.merchant);
  if (key) await ruleRepository.save(userId, { merchantKey: key, ...choice }, db);
  const wallet = walletCardKey(notice.walletCard);
  if (wallet && choice.kind === "EXPENSE" && choice.accountId) {
    await ruleRepository.save(
      userId,
      { ...choice, merchantKey: wallet, categoryId: null, toAccountId: null },
      db,
    );
  }
}
