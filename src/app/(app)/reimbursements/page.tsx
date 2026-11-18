import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { listAccounts } from "@/modules/accounts";
import { getCategoryTree } from "@/modules/categories";
import { requireUser } from "@/modules/identity";
import { getReimbursementTotals, listReimbursements } from "@/modules/reimbursements";
import { ClaimForm, ReimbursementList } from "@/modules/reimbursements/ui";
import { today as todayIn } from "@/shared/domain";
import { FormDialog, PageHeader, Stat, formatMoney } from "@/shared/ui";
import { MORE_BACK } from "../nav-items";

export const metadata: Metadata = { title: "Devoluciones" };

/** Name of the default income category where reimbursements are recorded. */
const DEFAULT_CATEGORY = "Reembolsos";

export default async function ReimbursementsPage() {
  const user = await requireUser();
  const today = todayIn(user.timezone);
  const [claims, totals, accounts, incomeCategories] = await Promise.all([
    listReimbursements(user.id),
    getReimbursementTotals(user.id, today),
    listAccounts(user.id),
    getCategoryTree(user.id, { kind: "INCOME" }),
  ]);
  const approved =
    totals
      .filter((t) => t.approved > 0)
      .map((t) => formatMoney(t.approved, t.currency))
      .join(" + ") || "—";
  const approvedCount = totals.reduce((n, t) => n + t.approvedCount, 0);
  const lateCount = totals.reduce((n, t) => n + t.lateCount, 0);
  const inReviewCount = totals.reduce((n, t) => n + t.inReviewCount, 0);
  const estimated = totals
    .filter((t) => t.estimated > 0)
    .map((t) => formatMoney(t.estimated, t.currency))
    .join(" + ");

  return (
    <>
      <PageHeader
        back={MORE_BACK}
        title="Devoluciones"
        description="Reembolsos de isapre, seguros y otros: desde que los pides hasta que llegan."
        actions={
          <FormDialog
            trigger="Nueva devolución"
            title="Nueva devolución"
            size="lg"
            icon={<Plus className="size-4" />}
          >
            <ClaimForm baseCurrency={user.baseCurrency} today={today} />
          </FormDialog>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Stat
          label="Por recibir"
          value={approved}
          tone={approvedCount > 0 ? "positive" : undefined}
          hint={
            approvedCount === 0
              ? "Nada aprobado pendiente"
              : `${approvedCount} aprobada${approvedCount === 1 ? "" : "s"}` +
                (lateCount > 0 ? ` · ${lateCount} atrasada${lateCount === 1 ? "" : "s"}` : "")
          }
        />
        <Stat
          label="En revisión"
          value={inReviewCount}
          hint={estimated ? `Aprox. ${estimated}` : "Sin monto confirmado"}
        />
      </div>
      <ReimbursementList
        claims={claims}
        accounts={accounts.filter((a) => !a.archived)}
        incomeCategories={incomeCategories}
        defaultCategoryId={incomeCategories.find((c) => c.name === DEFAULT_CATEGORY)?.id}
        baseCurrency={user.baseCurrency}
        today={today}
      />
    </>
  );
}
