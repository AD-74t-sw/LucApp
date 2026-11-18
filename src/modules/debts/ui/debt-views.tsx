import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Account } from "@/modules/accounts";
import type { LocalDate } from "@/shared/domain";
import {
  Badge,
  Card,
  ColorDot,
  EmptyState,
  FormDialog,
  InlineAction,
  MoneyText,
  ProgressBar,
  formatDate,
  cn,
  formatMoney,
} from "@/shared/ui";
import type { PersonSummary } from "../application/debt-queries";
import {
  type CurrencyBalance,
  paymentsCountAsSpending,
  isOverdue,
  outstanding,
  paidAmount,
} from "../domain/debt";
import type { DebtListItem } from "../infrastructure/debt-repository";
import {
  deleteDebtAction,
  deletePaymentAction,
  recordPaymentAction,
  updatePaymentAction,
} from "./actions";
import { PaymentForm } from "./debt-forms";

/** "Te debe $X" / "Le debes $Y" per currency. */
export function BalanceLines({ balances }: { balances: readonly CurrencyBalance[] }) {
  if (balances.length === 0) return <p className="text-muted text-sm">Sin deudas pendientes</p>;
  return (
    <ul className="flex flex-col gap-0.5">
      {balances.map((b) => (
        <li key={b.currency} className="text-sm">
          {b.net > 0 ? (
            <span className="text-positive">Te debe {formatMoney(b.net, b.currency)}</span>
          ) : b.net < 0 ? (
            <span className="text-negative">Le debes {formatMoney(-b.net, b.currency)}</span>
          ) : (
            <span className="text-muted">Están a mano en {b.currency}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function PeopleGrid({ people }: { people: readonly PersonSummary[] }) {
  if (people.length === 0) {
    return (
      <EmptyState
        title="Aún no registras personas"
        description="Agrega a quienes les prestas o te prestan dinero para llevar la cuenta."
      />
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {people.map((person) => (
        <Link key={person.id} href={`/debts/${person.id}`} className="group">
          <Card className="group-hover:border-accent flex h-full flex-col gap-2 transition">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{person.name}</p>
              {person.openDebts > 0 ? <Badge>{person.openDebts} abiertas</Badge> : null}
            </div>
            <BalanceLines balances={person.balances} />
          </Card>
        </Link>
      ))}
    </div>
  );
}

function DebtCard({
  debt,
  accounts,
  today,
}: {
  debt: DebtListItem;
  accounts: readonly Account[];
  today: LocalDate;
}) {
  const pending = outstanding(debt);
  const theyOwe = debt.direction === "THEY_OWE";
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{debt.description}</p>
            <Badge tone={theyOwe ? "positive" : "negative"}>{theyOwe ? "Te debe" : "Debes"}</Badge>
            {debt.settled ? <Badge tone="positive">Saldada</Badge> : null}
            {isOverdue(debt, today) ? <Badge tone="warning">Vencida</Badge> : null}
            {paymentsCountAsSpending(debt) ? (
              <Badge tone="accent">Los abonos cuentan como gasto</Badge>
            ) : null}
          </div>
          <p className="text-muted flex flex-wrap items-center gap-x-1 text-xs">
            {debt.categoryName ? (
              <span className="text-foreground inline-flex items-center gap-1">
                <ColorDot color={debt.categoryColor ?? "#9aa3b2"} className="size-2" />
                {debt.categoryName} ·
              </span>
            ) : (
              <span className="text-warning">Sin categoría ·</span>
            )}
            {formatDate(debt.date)}
            {debt.dueDate ? ` · vence ${formatDate(debt.dueDate)}` : ""}
            {debt.transactionId ? " · registrada en cuenta" : ""}
          </p>
        </div>
        <div className="flex items-center">
          <Link
            href={`/debts/${debt.personId}/${debt.id}`}
            aria-label="Editar deuda"
            title="Editar deuda"
            className="text-muted hover:bg-surface-muted hover:text-foreground rounded-xs p-1.5"
          >
            <Pencil className="size-4" />
          </Link>
          <InlineAction
            action={deleteDebtAction.bind(null, debt.id)}
            label=""
            confirm="¿Eliminar esta deuda con sus abonos y movimientos asociados?"
            icon={<Trash2 className="size-4" aria-label="Eliminar deuda" />}
          />
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-muted text-sm">
          Pagado {formatMoney(paidAmount(debt), debt.currency)} de{" "}
          {formatMoney(debt.principal, debt.currency)}
        </span>
        <MoneyText
          amount={pending}
          currency={debt.currency}
          className={cn(
            "text-lg font-semibold",
            pending > 0 && (theyOwe ? "text-positive" : "text-negative"),
          )}
        />
      </div>
      <ProgressBar ratio={paidAmount(debt) / debt.principal} />

      {debt.payments.length > 0 ? (
        <ul className="divide-border border-border divide-y rounded-xs border">
          {debt.payments.map((payment) => (
            <li key={payment.id} className="px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted">{formatDate(payment.date)}</span>
                <span className="min-w-0 flex-1 truncate">
                  {payment.note ?? "Abono"}
                  {payment.transactionId ? <span className="text-muted"> · en cuenta</span> : null}
                </span>
                <MoneyText amount={payment.amount} currency={debt.currency} />
                <FormDialog
                  trigger={null}
                  title="Editar abono"
                  description={debt.description}
                  variant="ghost"
                  buttonSize="icon"
                  ariaLabel="Editar abono"
                  icon={<Pencil className="size-3.5" />}
                >
                  <PaymentForm
                    action={updatePaymentAction.bind(null, payment.id)}
                    idPrefix={`edit-${payment.id}`}
                    accounts={accounts}
                    today={today}
                    currency={debt.currency}
                    payment={payment}
                  />
                </FormDialog>
                <InlineAction
                  action={deletePaymentAction.bind(null, payment.id)}
                  label=""
                  confirm="¿Eliminar este abono?"
                  icon={<Trash2 className="size-3.5" aria-label="Eliminar abono" />}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {!debt.settled ? (
        <div>
          <FormDialog
            trigger="Registrar abono"
            title="Registrar abono"
            description={`${debt.description} · pendiente ${formatMoney(pending, debt.currency)}`}
            variant="secondary"
            icon={<Plus className="size-4" />}
          >
            <PaymentForm
              action={recordPaymentAction.bind(null, debt.id)}
              idPrefix={`pay-${debt.id}`}
              accounts={accounts.filter((a) => a.currency === debt.currency)}
              today={today}
              currency={debt.currency}
            />
          </FormDialog>
        </div>
      ) : null}
    </Card>
  );
}

export function DebtList({
  debts,
  accounts,
  today,
}: {
  debts: readonly DebtListItem[];
  accounts: readonly Account[];
  today: LocalDate;
}) {
  if (debts.length === 0) {
    return <EmptyState title="Sin deudas registradas con esta persona." />;
  }
  return (
    <div className="flex flex-col gap-3">
      {debts.map((debt) => (
        <DebtCard key={debt.id} debt={debt} accounts={accounts} today={today} />
      ))}
    </div>
  );
}
