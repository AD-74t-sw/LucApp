import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Bell,
  ClipboardPaste,
  Mail,
  MessageSquare,
  Smartphone,
} from "lucide-react";
import type { Account, Card } from "@/modules/accounts";
import { InstitutionLogo } from "@/modules/accounts/ui";
import type { CategoryNode } from "@/modules/categories";
import { type LocalDate, toDecimalString } from "@/shared/domain";
import {
  Badge,
  Card as Panel,
  EmptyState,
  FormDialog,
  InlineAction,
  MoneyText,
  formatDate,
} from "@/shared/ui";
import type { InboxItem } from "../application/inbox-queries";
import { type NoticeChannel, directionOf, movementDay } from "../domain/notice";
import type { NoticeWithCopies } from "../infrastructure/notice-repository";
import {
  dismissNoticeAction,
  recordNoticeExpenseAction,
  recordNoticeIncomeAction,
  recordNoticeTransferAction,
  restoreNoticeAction,
} from "./actions";
import {
  CHANNEL_LABELS,
  NOTICE_KIND_LABELS,
  STATUS_LABELS,
  TRANSFER_REASON_LABELS,
} from "./labels";
import { ReviewForms } from "./review-forms";

type ReviewContext = Readonly<{
  accounts: readonly Account[];
  cards: readonly Card[];
  expenseCategories: readonly CategoryNode[];
  incomeCategories: readonly CategoryNode[];
  today: LocalDate;
  timeZone: string;
  referenceRate: { rate: number; date: LocalDate } | null;
}>;

function NoticeIcon({ notice }: { notice: NoticeWithCopies }) {
  const direction = directionOf(notice.kind);
  const Icon =
    notice.kind === "CARD_PAYMENT"
      ? ArrowLeftRight
      : direction === "IN"
        ? ArrowDownLeft
        : ArrowUpRight;
  return (
    <InstitutionLogo
      name={notice.institution}
      size={36}
      fallback={
        <span className="border-border bg-surface-muted flex size-9 shrink-0 items-center justify-center rounded-xs border">
          <Icon className="size-4" aria-hidden />
        </span>
      }
    />
  );
}

function SignedAmount({ notice, className }: { notice: NoticeWithCopies; className?: string }) {
  if (notice.amount === null || notice.currency === null) {
    return <span className="text-muted text-sm">Sin monto</span>;
  }
  const out = directionOf(notice.kind) !== "IN";
  return (
    <MoneyText
      amount={out ? -notice.amount : notice.amount}
      currency={notice.currency}
      colored
      signed
      className={className}
    />
  );
}

const CHANNEL_ICONS: Record<NoticeChannel, typeof Mail> = {
  PUSH: Bell,
  WALLET: Smartphone,
  SMS: MessageSquare,
  EMAIL: Mail,
  MANUAL: ClipboardPaste,
};

/** "Notificación", or "Llegó por notificación y Apple Pay" when channels were merged. */
function Channels({ notice }: { notice: NoticeWithCopies }) {
  const channels = [...new Set([notice.channel, ...notice.copies])];
  const inSentence = (channel: NoticeChannel) =>
    channel === "SMS" || channel === "WALLET"
      ? CHANNEL_LABELS[channel]
      : CHANNEL_LABELS[channel].toLowerCase();
  return (
    <span className="text-muted inline-flex items-center gap-1 text-xs">
      {channels.map((channel) => {
        const Icon = CHANNEL_ICONS[channel];
        return <Icon key={channel} className="size-3.5" aria-hidden />;
      })}
      {channels.length > 1
        ? `Llegó por ${channels.map(inSentence).join(" y ")}`
        : CHANNEL_LABELS[notice.channel]}
    </span>
  );
}

function details(notice: NoticeWithCopies, timeZone: string): string {
  return [
    NOTICE_KIND_LABELS[notice.kind],
    notice.institution,
    `${formatDate(movementDay(notice, timeZone))}${notice.occurredTime ? ` ${notice.occurredTime}` : ""}`,
    notice.last4 ? `•••• ${notice.last4}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** One pending notice: what it says, the suggestion, and the buttons to record or dismiss it. */
function PendingNotice({ item, context }: { item: InboxItem; context: ReviewContext }) {
  const { suggestion } = item;
  const amount =
    item.amount !== null && item.currency !== null
      ? toDecimalString(item.amount, item.currency)
      : undefined;
  const date = movementDay(item, context.timeZone);
  const description = item.merchant ?? NOTICE_KIND_LABELS[item.kind];
  const title = item.merchant ?? NOTICE_KIND_LABELS[item.kind];

  return (
    <article aria-label={title}>
      <Panel className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <NoticeIcon notice={item} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{title}</p>
            <p className="text-muted truncate text-xs">{details(item, context.timeZone)}</p>
          </div>
          <SignedAmount notice={item} className="text-lg font-semibold" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Channels notice={item} />
          {suggestion.transferReason ? (
            <Badge tone="accent">
              Entre tus cuentas · {TRANSFER_REASON_LABELS[suggestion.transferReason]}
            </Badge>
          ) : suggestion.learned ? (
            <Badge tone="accent">Sugerido según la última vez</Badge>
          ) : null}
        </div>

        {item.similar.length > 0 ? (
          <div className="border-warning/30 bg-warning-soft text-warning rounded-xs border px-3 py-2 text-sm">
            Ya registraste un movimiento por este monto:{" "}
            {item.similar
              .slice(0, 2)
              .map((t) => `«${t.description}» (${formatDate(t.date)})`)
              .join(", ")}
            . Si es el mismo, descarta este aviso.
          </div>
        ) : null}

        <details className="text-sm">
          <summary className="text-muted cursor-pointer text-xs">Ver aviso original</summary>
          <p className="bg-surface-muted mt-2 rounded-xs p-3 text-xs whitespace-pre-wrap">
            {item.subject ? <strong className="block">{item.subject}</strong> : null}
            {item.text}
          </p>
        </details>

        <div className="flex items-center gap-2">
          <FormDialog
            trigger="Registrar"
            title="Registrar aviso"
            description={`${title} · ${details(item, context.timeZone)}`}
            size="lg"
          >
            <ReviewForms
              initialKind={suggestion.kind}
              actions={{
                EXPENSE: recordNoticeExpenseAction.bind(null, item.id),
                INCOME: recordNoticeIncomeAction.bind(null, item.id),
                TRANSFER: recordNoticeTransferAction.bind(null, item.id, suggestion.pairedNoticeId),
              }}
              movement={{
                amount,
                date,
                description,
                currency: item.currency ?? undefined,
                categoryId: suggestion.categoryId ?? undefined,
                accountId: suggestion.accountId ?? undefined,
                cardId: suggestion.cardId ?? undefined,
              }}
              transfer={{
                amount,
                date,
                description: item.merchant ? `Transferencia · ${item.merchant}` : undefined,
                fromAccountId: suggestion.fromAccountId ?? undefined,
                toAccountId: suggestion.toAccountId ?? undefined,
              }}
              accounts={context.accounts}
              cards={context.cards}
              expenseCategories={context.expenseCategories}
              incomeCategories={context.incomeCategories}
              today={context.today}
              referenceRate={context.referenceRate}
            />
          </FormDialog>
          <InlineAction
            action={dismissNoticeAction.bind(null, item.id)}
            label="Descartar"
            variant="secondary"
          />
        </div>
      </Panel>
    </article>
  );
}

export function PendingNoticeList({
  items,
  context,
}: {
  items: readonly InboxItem[];
  context: ReviewContext;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No tienes avisos por revisar"
        description="Cuando tu banco te avise de una compra o transferencia, o pagues con Apple Pay, aparecerá aquí para que la categorices."
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <PendingNotice key={item.id} item={item} context={context} />
      ))}
    </div>
  );
}

/** Notices already handled: recorded, dismissed or merged as a repeat of another. */
export function ReviewedNoticeList({
  notices,
  timeZone,
}: {
  notices: readonly NoticeWithCopies[];
  timeZone: string;
}) {
  if (notices.length === 0) return <EmptyState title="Todavía no revisas avisos." />;
  return (
    <ul className="border-border bg-surface divide-border divide-y border">
      {notices.map((notice) => (
        <li key={notice.id} className="flex items-center gap-3 px-4 py-3">
          <NoticeIcon notice={notice} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 truncate text-sm font-medium">
              {notice.merchant ?? NOTICE_KIND_LABELS[notice.kind]}
              <Badge tone={notice.status === "RECORDED" ? "positive" : "neutral"}>
                {STATUS_LABELS[notice.status]}
              </Badge>
            </p>
            <p className="text-muted truncate text-xs">
              {details(notice, timeZone)} · {CHANNEL_LABELS[notice.channel]}
            </p>
          </div>
          <SignedAmount notice={notice} className="text-sm" />
          {notice.status === "DISMISSED" || notice.status === "DUPLICATE" ? (
            <InlineAction
              action={restoreNoticeAction.bind(null, notice.id)}
              label="Devolver"
              variant="ghost"
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
