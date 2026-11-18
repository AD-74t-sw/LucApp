import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { listAccounts } from "@/modules/accounts";
import { getCategoryTree } from "@/modules/categories";
import { getDebtTotals, listPeopleWithBalances } from "@/modules/debts";
import { DebtForm, PeopleGrid, PersonForm } from "@/modules/debts/ui";
import { requireUser } from "@/modules/identity";
import { today } from "@/shared/domain";
import { FormDialog, PageHeader, Stat, formatMoney } from "@/shared/ui";
import { MORE_BACK } from "../nav-items";

export const metadata: Metadata = { title: "Deudas" };

export default async function DebtsPage() {
  const user = await requireUser();
  const [people, totals, accounts, categories] = await Promise.all([
    listPeopleWithBalances(user.id),
    getDebtTotals(user.id),
    listAccounts(user.id),
    getCategoryTree(user.id, { kind: "EXPENSE" }),
  ]);
  const list = (pick: (t: (typeof totals)[number]) => number) =>
    totals
      .filter((t) => pick(t) > 0)
      .map((t) => formatMoney(pick(t), t.currency))
      .join(" + ") || "—";

  return (
    <>
      <PageHeader
        back={MORE_BACK}
        title="Deudas"
        description="Lo que te deben y lo que debes a otras personas."
        actions={
          <>
            <FormDialog
              trigger="Nueva persona"
              title="Nueva persona"
              variant={people.length > 0 ? "secondary" : "primary"}
              icon={<Plus className="size-4" />}
            >
              <PersonForm />
            </FormDialog>
            {people.length > 0 ? (
              <FormDialog
                trigger="Nueva deuda"
                title="Nueva deuda"
                size="lg"
                icon={<Plus className="size-4" />}
              >
                <DebtForm
                  people={people}
                  accounts={accounts}
                  categories={categories}
                  baseCurrency={user.baseCurrency}
                  today={today(user.timezone)}
                />
              </FormDialog>
            ) : null}
          </>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Stat label="Te deben" value={list((t) => t.owedToMe)} />
        <Stat label="Debes" value={list((t) => t.iOwe)} />
      </div>
      <PeopleGrid people={people} />
    </>
  );
}
