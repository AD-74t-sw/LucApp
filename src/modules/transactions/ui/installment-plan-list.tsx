import { Trash2 } from "lucide-react";
import { Card, EmptyState, InlineAction, ProgressBar, formatDate, formatMoney } from "@/shared/ui";
import type { InstallmentPlanSummary } from "../application/transaction-queries";
import { deleteInstallmentPlanAction } from "./actions";

export function InstallmentPlanList({ plans }: { plans: readonly InstallmentPlanSummary[] }) {
  if (plans.length === 0) {
    return (
      <EmptyState
        title="Sin compras en cuotas"
        description="Cuando registres una compra en cuotas verás aquí cuánto llevas pagado y cuánto falta."
      />
    );
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {plans.map((plan) => {
        const { progress } = plan;
        const finished = progress.charged >= plan.installmentCount;
        return (
          <Card key={plan.id} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{plan.description}</p>
                <p className="text-muted truncate text-xs">
                  {plan.categoryName} · {plan.accountName}
                  {plan.cardName ? ` · ${plan.cardName}` : ""}
                </p>
              </div>
              <InlineAction
                action={deleteInstallmentPlanAction.bind(null, plan.id)}
                label=""
                confirm="¿Eliminar la compra y todas sus cuotas?"
                icon={<Trash2 className="size-4" aria-label="Eliminar compra" />}
              />
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="tabular text-lg font-semibold">
                {formatMoney(plan.totalAmount, plan.currency)}
              </span>
              <span className="text-muted text-sm">
                {progress.charged}/{plan.installmentCount} cuotas
              </span>
            </div>
            <ProgressBar ratio={progress.charged / plan.installmentCount} />
            <div className="text-muted flex justify-between text-xs">
              <span>Pagado {formatMoney(progress.chargedAmount, plan.currency)}</span>
              <span>
                {finished
                  ? "Terminada"
                  : `Faltan ${formatMoney(progress.remainingAmount, plan.currency)}${
                      progress.nextChargeDate
                        ? ` · próxima ${formatDate(progress.nextChargeDate)}`
                        : ""
                    }`}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
