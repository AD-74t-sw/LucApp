import { Check, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import type { Account } from "@/modules/accounts";
import type { CategoryNode } from "@/modules/categories";
import type { CurrencyCode, LocalDate } from "@/shared/domain";
import {
  Badge,
  Card,
  EmptyState,
  FormDialog,
  InlineAction,
  MoneyText,
  cn,
  formatDate,
  formatMoney,
} from "@/shared/ui";
import {
  type Reimbursement,
  type ReimbursementStatus,
  arrivalOf,
  isOpen,
} from "../domain/reimbursement";
import {
  approveReimbursementAction,
  deleteReimbursementAction,
  markReceivedAction,
  rejectReimbursementAction,
  reopenReimbursementAction,
  updateReimbursementAction,
} from "./actions";
import { ApprovalForm, ClaimForm, ReceiptForm } from "./reimbursement-forms";
import { ARRIVAL_LABELS, KIND_LABELS, STATUS_LABELS } from "./labels";

type Context = {
  accounts: readonly Account[];
  incomeCategories: readonly CategoryNode[];
  defaultCategoryId?: string;
  baseCurrency: CurrencyCode;
  today: LocalDate;
};

const STATUS_TONES: Record<ReimbursementStatus, "neutral" | "accent" | "positive" | "negative"> = {
  IN_REVIEW: "neutral",
  APPROVED: "accent",
  RECEIVED: "positive",
  REJECTED: "negative",
};

/** The amount that matters at each stage, and what to call it. */
function AmountBlock({ claim }: { claim: Reimbursement }) {
  const { currency } = claim;
  if (claim.status === "RECEIVED" && claim.receivedAmount !== null) {
    return (
      <div className="text-right">
        <MoneyText
          amount={claim.receivedAmount}
          currency={currency}
          className="text-positive text-lg font-semibold"
        />
        {claim.amount !== null && claim.amount !== claim.receivedAmount ? (
          <p className="text-muted text-xs">Aprobado {formatMoney(claim.amount, currency)}</p>
        ) : null}
      </div>
    );
  }
  if (claim.amount !== null) {
    return (
      <MoneyText
        amount={claim.amount}
        currency={currency}
        className={cn(
          "text-lg font-semibold",
          claim.status === "REJECTED" ? "text-muted line-through" : "text-positive",
        )}
      />
    );
  }
  return (
    <div className="text-right">
      <p className="text-muted text-sm">Monto por confirmar</p>
      {claim.estimatedAmount !== null ? (
        <p className="text-muted text-xs">Aprox. {formatMoney(claim.estimatedAmount, currency)}</p>
      ) : null}
    </div>
  );
}

function StageLine({ claim, today }: { claim: Reimbursement; today: LocalDate }) {
  if (claim.status === "APPROVED" && claim.expectedFrom && claim.expectedTo) {
    const late = arrivalOf(claim, today) === "LATE";
    const window =
      claim.expectedFrom === claim.expectedTo
        ? `el ${formatDate(claim.expectedFrom)}`
        : `entre el ${formatDate(claim.expectedFrom)} y el ${formatDate(claim.expectedTo)}`;
    return (
      <p className={cn("text-sm", late ? "text-warning" : "text-muted")}>
        {late ? `Debía llegar ${window}` : `Llega ${window}`}
      </p>
    );
  }
  if (claim.status === "RECEIVED" && claim.receivedOn) {
    return (
      <p className="text-muted text-sm">
        Recibida el {formatDate(claim.receivedOn)}
        {claim.transactionId ? " · registrada como ingreso" : ""}
      </p>
    );
  }
  if (claim.status === "IN_REVIEW") {
    return <p className="text-muted text-sm">Esperando respuesta</p>;
  }
  return null;
}

function ReimbursementCard({ claim, context }: { claim: Reimbursement; context: Context }) {
  const { accounts, incomeCategories, defaultCategoryId, baseCurrency, today } = context;
  const arrival = arrivalOf(claim, today);
  const subtitle = `${claim.provider} · ${claim.description}`;
  return (
    <Card className="flex flex-col gap-3" aria-label={claim.description}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{claim.description}</p>
            <Badge tone={STATUS_TONES[claim.status]}>{STATUS_LABELS[claim.status]}</Badge>
            {arrival === "LATE" || arrival === "IN_WINDOW" ? (
              <Badge tone={arrival === "LATE" ? "warning" : "accent"}>
                {ARRIVAL_LABELS[arrival]}
              </Badge>
            ) : null}
          </div>
          <p className="text-muted text-xs">
            {claim.provider} · {KIND_LABELS[claim.kind]} · solicitada el{" "}
            {formatDate(claim.requestedOn)}
          </p>
        </div>
        <AmountBlock claim={claim} />
      </div>

      <StageLine claim={claim} today={today} />
      {claim.note ? <p className="text-muted text-xs whitespace-pre-line">{claim.note}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        {isOpen(claim) ? (
          <>
            <FormDialog
              trigger={claim.amount === null ? "Ingresar monto y fechas" : "Cambiar monto o fechas"}
              title={claim.amount === null ? "Monto y fechas de pago" : "Cambiar monto o fechas"}
              description={subtitle}
              variant={claim.status === "IN_REVIEW" ? "primary" : "secondary"}
            >
              <ApprovalForm
                action={approveReimbursementAction.bind(null, claim.id)}
                claim={claim}
              />
            </FormDialog>
            <FormDialog
              trigger="Marcar como devuelta"
              title="Marcar como devuelta"
              description={subtitle}
              variant={claim.status === "APPROVED" ? "primary" : "secondary"}
              icon={<Check className="size-4" />}
            >
              <ReceiptForm
                action={markReceivedAction.bind(null, claim.id)}
                claim={claim}
                accounts={accounts.filter(
                  (a) => a.currency === claim.currency || a.secondaryCurrency === claim.currency,
                )}
                incomeCategories={incomeCategories}
                defaultCategoryId={defaultCategoryId}
                today={today}
              />
            </FormDialog>
            <InlineAction
              action={rejectReimbursementAction.bind(null, claim.id)}
              label="Rechazada"
              confirm="¿Marcar esta devolución como rechazada?"
              icon={<X className="size-4" />}
            />
          </>
        ) : (
          <InlineAction
            action={reopenReimbursementAction.bind(null, claim.id)}
            label="Reabrir"
            confirm={
              claim.transactionId
                ? "¿Reabrir esta devolución? Se eliminará el ingreso que se registró en la cuenta."
                : "¿Reabrir esta devolución?"
            }
            icon={<RotateCcw className="size-4" />}
          />
        )}
        <div className="ml-auto flex items-center">
          <FormDialog
            trigger={null}
            title="Editar devolución"
            variant="ghost"
            buttonSize="icon"
            ariaLabel="Editar devolución"
            icon={<Pencil className="size-4" />}
            size="lg"
          >
            <ClaimForm
              action={updateReimbursementAction.bind(null, claim.id)}
              claim={claim}
              baseCurrency={baseCurrency}
              today={today}
            />
          </FormDialog>
          <InlineAction
            action={deleteReimbursementAction.bind(null, claim.id)}
            label=""
            confirm={
              claim.transactionId
                ? "¿Eliminar esta devolución y el ingreso que registró en la cuenta?"
                : "¿Eliminar esta devolución?"
            }
            icon={<Trash2 className="size-4" aria-label="Eliminar devolución" />}
          />
        </div>
      </div>
    </Card>
  );
}

function Section({
  title,
  claims,
  context,
}: {
  title: string;
  claims: readonly Reimbursement[];
  context: Context;
}) {
  if (claims.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="eyebrow">
        {title} · {claims.length}
      </h2>
      {claims.map((claim) => (
        <ReimbursementCard key={claim.id} claim={claim} context={context} />
      ))}
    </section>
  );
}

/** Claims grouped by stage: waiting for an answer, waiting for the money, history. */
export function ReimbursementList({
  claims,
  ...context
}: Context & { claims: readonly Reimbursement[] }) {
  if (claims.length === 0) {
    return (
      <EmptyState
        title="Sin devoluciones registradas"
        description="Anota los reembolsos que pediste a tu isapre, seguro complementario u otros, aunque aún no sepas el monto."
      />
    );
  }
  return (
    <div className="flex flex-col gap-8">
      <Section
        title="Por recibir"
        claims={claims.filter((c) => c.status === "APPROVED")}
        context={context}
      />
      <Section
        title="En revisión"
        claims={claims.filter((c) => c.status === "IN_REVIEW")}
        context={context}
      />
      <Section title="Historial" claims={claims.filter((c) => !isOpen(c))} context={context} />
    </div>
  );
}
