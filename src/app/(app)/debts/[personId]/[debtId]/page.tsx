import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listAccounts } from "@/modules/accounts";
import { getCategoryTree } from "@/modules/categories";
import { getDebt, listPeople } from "@/modules/debts";
import { DebtForm, updateDebtAction } from "@/modules/debts/ui";
import { requireUser } from "@/modules/identity";
import { isUuid, today } from "@/shared/domain";
import { Card, PageHeader } from "@/shared/ui";

export const metadata: Metadata = { title: "Editar deuda" };

export default async function EditDebtPage({ params }: PageProps<"/debts/[personId]/[debtId]">) {
  const { personId, debtId } = await params;
  if (!isUuid(personId) || !isUuid(debtId)) notFound();
  const user = await requireUser();
  const [debt, people, accounts, categories] = await Promise.all([
    getDebt(user.id, debtId),
    listPeople(user.id),
    listAccounts(user.id),
    getCategoryTree(user.id, { kind: "EXPENSE" }),
  ]);
  if (!debt || debt.personId !== personId) notFound();

  return (
    <>
      <PageHeader
        title="Editar deuda"
        description={debt.description}
        back={{
          href: `/debts/${personId}`,
          label: people.find((p) => p.id === personId)?.name ?? "Deudas",
        }}
      />
      <Card className="max-w-3xl">
        <DebtForm
          debt={debt}
          action={updateDebtAction.bind(null, debt.id)}
          people={people}
          accounts={accounts}
          categories={categories}
          baseCurrency={user.baseCurrency}
          today={today(user.timezone)}
        />
      </Card>
    </>
  );
}
