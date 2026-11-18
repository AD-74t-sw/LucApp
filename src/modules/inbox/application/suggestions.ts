import {
  type Account,
  type Card,
  findInstitution,
  isCreditAccount,
  normalizeInstitutionName,
} from "@/modules/accounts";
import { type BankNotice, type NoticeInstrument } from "../domain/notice";
import { isOwnName, isTransferPair } from "../domain/own-transfer";
import { merchantKey, plain } from "../domain/text";
import { walletCardKey } from "../domain/wallet";
import type { NoticeRule } from "../infrastructure/rule-repository";

export type ReviewKind = "EXPENSE" | "INCOME" | "TRANSFER";

/** Why a notice is suggested as a transfer between own accounts. */
export type TransferReason = "LEARNED" | "OWN_NAME" | "PAIRED" | "CARD_PAYMENT" | "WITHDRAWAL";

/** How the review form starts for a notice. Everything can be changed before saving. */
export type ReviewSuggestion = Readonly<{
  kind: ReviewKind;
  transferReason: TransferReason | null;
  /** True when a previous decision about this merchant was reused. */
  learned: boolean;
  categoryId: string | null;
  /** Expense or income account. */
  accountId: string | null;
  cardId: string | null;
  /** Transfers. */
  fromAccountId: string | null;
  toAccountId: string | null;
  /** The other leg of a transfer between own accounts, recorded together. */
  pairedNoticeId: string | null;
}>;

type Context = Readonly<{
  ownName: string;
  timeZone: string;
  accounts: readonly Account[];
  cards: readonly Card[];
  /** Every pending notice, to find the other leg of transfers. */
  pending: readonly BankNotice[];
  rules: readonly NoticeRule[];
}>;

/**
 * Proposes how to record a notice: as an expense, an income or a transfer
 * between own accounts, with which account, card and category. Transfers are
 * recognized from a learned decision, card payments, ATM withdrawals (to cash),
 * the person's own name as counterparty, or a matching notice of the other leg.
 */
export function suggestReview(
  notice: BankNotice & { walletCard?: string | null },
  context: Context,
): ReviewSuggestion {
  const { accounts, cards } = context;
  const live = accounts.filter((a) => !a.archived);
  const key = merchantKey(notice.merchant);
  const rule = key ? context.rules.find((r) => r.merchantKey === key) : undefined;
  // The card used in Apple Pay says more than the bank or a past purchase there.
  const paidWith = matchWalletCard(live, cards, notice.walletCard ?? null, context.rules);
  const here =
    paidWith ?? matchAccount(live, cards, notice.institution, notice.last4, notice.instrument);
  const elsewhere = notice.counterpartyInstitution
    ? matchAccount(live, cards, notice.counterpartyInstitution, null, "DEBIT")
    : null;
  const exists = (id: string | null | undefined) =>
    id ? (live.some((a) => a.id === id) ? id : null) : null;

  const pair = context.pending.find(
    (other) =>
      other.id !== notice.id &&
      (isTransferPair(notice, other, context.timeZone) ||
        isTransferPair(other, notice, context.timeZone)),
  );
  const pairAccount = pair
    ? (matchAccount(live, cards, pair.institution, pair.last4, "DEBIT")?.accountId ?? null)
    : null;

  const transfer = (
    reason: TransferReason,
    from: string | null,
    to: string | null,
  ): ReviewSuggestion => ({
    kind: "TRANSFER",
    transferReason: reason,
    learned: reason === "LEARNED",
    categoryId: null,
    accountId: null,
    cardId: null,
    fromAccountId: from,
    toAccountId: to,
    pairedNoticeId: pair?.id ?? null,
  });
  const incoming = notice.kind === "TRANSFER_IN" || notice.kind === "DEPOSIT";

  if (rule?.kind === "TRANSFER") {
    return transfer("LEARNED", exists(rule.accountId), exists(rule.toAccountId));
  }
  if (notice.kind === "CARD_PAYMENT") {
    const card =
      matchAccount(
        live,
        cards,
        notice.counterpartyInstitution ?? notice.institution,
        notice.last4,
        "CREDIT",
      ) ?? null;
    const payer = matchAccount(live, cards, notice.institution, null, "DEBIT");
    return transfer("CARD_PAYMENT", payer?.accountId ?? null, card?.accountId ?? null);
  }
  if (notice.kind === "WITHDRAWAL") {
    const cash = live.find((a) => a.type === "CASH");
    const bank = matchAccount(live, cards, notice.institution, notice.last4, "DEBIT");
    return transfer("WITHDRAWAL", bank?.accountId ?? null, cash?.id ?? null);
  }
  if (
    (notice.kind === "TRANSFER_OUT" || incoming) &&
    (isOwnName(notice.merchant, context.ownName) || pair)
  ) {
    const reason = pair && !isOwnName(notice.merchant, context.ownName) ? "PAIRED" : "OWN_NAME";
    const mine = here?.accountId ?? null;
    const other = pairAccount ?? elsewhere?.accountId ?? null;
    return incoming ? transfer(reason, other, mine) : transfer(reason, mine, other);
  }

  const kind: ReviewKind = rule?.kind === "INCOME" || (!rule && incoming) ? "INCOME" : "EXPENSE";
  return {
    kind,
    transferReason: null,
    learned: rule !== undefined,
    categoryId: rule?.categoryId ?? null,
    accountId: paidWith?.accountId ?? exists(rule?.accountId) ?? here?.accountId ?? null,
    cardId:
      kind !== "EXPENSE"
        ? null
        : paidWith
          ? paidWith.cardId
          : (rule?.cardId ?? here?.cardId ?? null),
    fromAccountId: null,
    toAccountId: null,
    pairedNoticeId: null,
  };
}

/**
 * The account (and card) a notice refers to: the card with those last digits,
 * else an account at that bank, preferring a credit card for credit purchases
 * and a checking account otherwise.
 */
export function matchAccount(
  accounts: readonly Account[],
  cards: readonly Card[],
  institution: string | null,
  last4: string | null,
  instrument: NoticeInstrument | null,
): { accountId: string; cardId: string | null } | null {
  if (last4) {
    const card = cards.find(
      (c) => !c.archived && c.last4 === last4 && accounts.some((a) => a.id === c.accountId),
    );
    if (card) return { accountId: card.accountId, cardId: card.id };
  }
  if (!institution) return null;
  const wanted = normalizeInstitutionName(institution);
  const atBank = accounts.filter((a) => {
    const name = findInstitution(a.institution)?.name ?? a.institution;
    return name ? normalizeInstitutionName(name) === wanted : false;
  });
  const rank = (a: Account) => {
    if (instrument === "CREDIT") return isCreditAccount(a.type) ? 0 : 1;
    const order = ["CHECKING", "DIGITAL_WALLET", "SAVINGS", "CREDIT_CARD", "CASH"];
    return order.indexOf(a.type);
  };
  const account = [...atBank].sort((a, b) => rank(a) - rank(b))[0];
  return account ? { accountId: account.id, cardId: null } : null;
}

/**
 * The account behind a card of Apple Wallet: the one chosen last time for that
 * card, else the card or account of LucApp whose name the Wallet name contains
 * ("Visa Signature Banco de Chile" -> the card named "Visa Signature").
 */
export function matchWalletCard(
  accounts: readonly Account[],
  cards: readonly Card[],
  walletCard: string | null,
  rules: readonly NoticeRule[],
): { accountId: string; cardId: string | null } | null {
  const ruleKey = walletCardKey(walletCard);
  if (!walletCard || !ruleKey) return null;
  const learned = rules.find((r) => r.merchantKey === ruleKey);
  if (learned?.accountId && accounts.some((a) => a.id === learned.accountId)) {
    const card = cards.find((c) => c.id === learned.cardId && !c.archived);
    return { accountId: learned.accountId, cardId: card?.id ?? null };
  }

  const key = (value: string) =>
    plain(value)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const wallet = key(walletCard);
  const named = (name: string) => {
    const own = key(name);
    return own.length >= 4 && (wallet.includes(own) || own.includes(wallet));
  };
  const card = cards.find(
    (c) => !c.archived && named(c.name) && accounts.some((a) => a.id === c.accountId),
  );
  if (card) return { accountId: card.accountId, cardId: card.id };
  const account = accounts.find((a) => named(a.name));
  return account ? { accountId: account.id, cardId: null } : null;
}
