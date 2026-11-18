import Link from "next/link";
import { ArrowLeftRight, HandCoins, Pencil, Trash2 } from "lucide-react";
import { CardNetworkLogo } from "@/modules/accounts/ui";
import { COST_TYPE_LABELS, NECESSITY_LABELS } from "@/modules/categories/ui";
import { Badge, ColorDot, EmptyState, InlineAction, MoneyText, formatDate } from "@/shared/ui";
import type { LocalDate } from "@/shared/domain";
import { ensureDeletable, ensureEditable } from "../domain/transaction";
import type { TransactionListItem } from "../infrastructure/transaction-repository";
import { deleteTransactionAction } from "./actions";

function groupByDate(items: readonly TransactionListItem[]) {
  const groups = new Map<LocalDate, TransactionListItem[]>();
  for (const item of items) {
    groups.set(item.date, [...(groups.get(item.date) ?? []), item]);
  }
  return [...groups.entries()];
}

function KindIcon({ item }: { item: TransactionListItem }) {
  if (item.kind === "TRANSFER")
    return <ArrowLeftRight className="text-muted size-4" aria-label="Transferencia" />;
  if (item.kind === "DEBT") return <HandCoins className="text-muted size-4" aria-label="Deuda" />;
  return <ColorDot color={item.categoryColor ?? "#9aa3b2"} className="size-3" />;
}

function Row({ item, today }: { item: TransactionListItem; today: LocalDate }) {
  const category = item.categoryName
    ? item.parentCategoryName
      ? `${item.parentCategoryName} › ${item.categoryName}`
      : item.categoryName
    : null;
  const meta = [category, item.accountName].filter(Boolean).join(" · ");
  return (
    <li className="flex items-start gap-3 py-3">
      <span className="mt-1 flex w-4 justify-center">
        <KindIcon item={item} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.description}</p>
        <p className="text-muted flex min-w-0 items-center gap-1.5 text-xs">
          <span className="truncate">{meta}</span>
          {item.cardName ? (
            <>
              <span aria-hidden>·</span>
              {item.cardNetwork ? <CardNetworkLogo network={item.cardNetwork} height={14} /> : null}
              <span className="truncate">{item.cardName}</span>
            </>
          ) : null}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {item.date > today ? <Badge tone="accent">Programado</Badge> : null}
          {item.costType ? <Badge>{COST_TYPE_LABELS[item.costType]}</Badge> : null}
          {item.necessity === "DISCRETIONARY" ? (
            <Badge tone="warning">{NECESSITY_LABELS[item.necessity]}</Badge>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <MoneyText
          amount={item.amount}
          currency={item.currency}
          colored
          signed
          className="font-medium"
        />
        <div className="flex items-center">
          {ensureEditable(item).ok ? (
            <Link
              href={`/transactions/${item.id}/edit`}
              aria-label="Editar"
              className="text-muted hover:bg-surface-muted hover:text-foreground rounded-xs p-1.5"
            >
              <Pencil className="size-3.5" />
            </Link>
          ) : null}
          {ensureDeletable(item).ok ? (
            <InlineAction
              action={deleteTransactionAction.bind(null, item.id)}
              label=""
              confirm={
                item.transferGroupId
                  ? "¿Eliminar la transferencia? Se eliminan ambos movimientos."
                  : "¿Eliminar este movimiento?"
              }
              icon={<Trash2 className="size-3.5" aria-label="Eliminar" />}
            />
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function TransactionList({
  items,
  today,
}: {
  items: readonly TransactionListItem[];
  today: LocalDate;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No hay movimientos"
        description="Registra tu primer gasto o cambia los filtros."
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {groupByDate(items).map(([date, group]) => (
        <section key={date}>
          <h3 className="text-muted text-xs font-medium tracking-wide uppercase">
            {formatDate(date)}
          </h3>
          <ul className="divide-border divide-y">
            {group.map((item) => (
              <Row key={item.id} item={item} today={today} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
