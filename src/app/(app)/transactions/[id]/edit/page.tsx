import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listAccounts, listCards } from "@/modules/accounts";
import { getCategoryTree } from "@/modules/categories";
import { requireUser } from "@/modules/identity";
import { getTransaction } from "@/modules/transactions";
import { TransactionForm, updateTransactionAction } from "@/modules/transactions/ui";
import { isUuid, today } from "@/shared/domain";
import { Card, PageHeader } from "@/shared/ui";

export const metadata: Metadata = { title: "Editar movimiento" };

export default async function EditTransactionPage({
  params,
}: PageProps<"/transactions/[id]/edit">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const user = await requireUser();
  const transaction = await getTransaction(user.id, id);
  if (!transaction || (transaction.kind !== "EXPENSE" && transaction.kind !== "INCOME")) notFound();

  const kind = transaction.kind;
  const [accounts, cards, categories] = await Promise.all([
    listAccounts(user.id),
    listCards(user.id),
    getCategoryTree(user.id, { kind }),
  ]);
  return (
    <>
      <PageHeader
        title={kind === "EXPENSE" ? "Editar gasto" : "Editar ingreso"}
        back={{ href: "/transactions", label: "Movimientos" }}
      />
      <Card className="max-w-3xl">
        <TransactionForm
          action={updateTransactionAction.bind(null, transaction.id)}
          kind={kind}
          accounts={accounts}
          cards={cards}
          categories={categories}
          today={today(user.timezone)}
          transaction={transaction}
        />
      </Card>
    </>
  );
}
