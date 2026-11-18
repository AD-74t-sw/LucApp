import { listAccounts, listCards } from "@/modules/accounts";
import { type Transaction, findSimilarTransactions } from "@/modules/transactions";
import { movementDay } from "../domain/notice";
import { merchantKey } from "../domain/text";
import { walletCardKey } from "../domain/wallet";
import { type NoticeWithCopies, noticeRepository } from "../infrastructure/notice-repository";
import { ruleRepository } from "../infrastructure/rule-repository";
import { type ReviewSuggestion, suggestReview } from "./suggestions";

export type InboxItem = NoticeWithCopies &
  Readonly<{
    suggestion: ReviewSuggestion;
    /** Movements already recorded with the same amount around that day. */
    similar: readonly Transaction[];
  }>;

type InboxUser = Readonly<{ id: string; name: string; timezone: string }>;

const PENDING_LIMIT = 100;

/** Notices waiting for review, newest first, each with a suggested way to record it. */
export async function listPendingNotices(user: InboxUser): Promise<InboxItem[]> {
  const pending = await noticeRepository.list(user.id, ["PENDING"], PENDING_LIMIT);
  if (pending.length === 0) return [];
  const keys = [
    ...new Set(
      pending
        .flatMap((n) => [merchantKey(n.merchant), walletCardKey(n.walletCard)])
        .filter((k) => k !== null),
    ),
  ];
  const [accounts, cards, rules] = await Promise.all([
    listAccounts(user.id),
    listCards(user.id),
    ruleRepository.findMany(user.id, keys),
  ]);
  const context = { ownName: user.name, timeZone: user.timezone, accounts, cards, pending, rules };
  return Promise.all(
    pending.map(async (notice) => ({
      ...notice,
      suggestion: suggestReview(notice, context),
      similar:
        notice.amount !== null && notice.currency !== null
          ? await findSimilarTransactions(user.id, {
              amount: notice.amount,
              currency: notice.currency,
              date: movementDay(notice, user.timezone),
            })
          : [],
    })),
  );
}

/** Recorded, dismissed and merged notices, newest first. */
export function listReviewedNotices(userId: string): Promise<NoticeWithCopies[]> {
  return noticeRepository.list(userId, ["RECORDED", "DISMISSED", "DUPLICATE"], 50);
}

export function countPendingNotices(userId: string): Promise<number> {
  return noticeRepository.countPending(userId);
}
