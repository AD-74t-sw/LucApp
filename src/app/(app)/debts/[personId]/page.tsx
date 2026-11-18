import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { listAccounts } from "@/modules/accounts";
import { getCategoryTree } from "@/modules/categories";
import { getPersonWithDebts } from "@/modules/debts";
import {
  BalanceLines,
  DebtForm,
  DebtList,
  PersonForm,
  deletePersonAction,
  updatePersonAction,
} from "@/modules/debts/ui";
import { requireUser } from "@/modules/identity";
import { isUuid, today as todayIn } from "@/shared/domain";
import { FormDialog, InlineAction, PageHeader } from "@/shared/ui";

export const metadata: Metadata = { title: "Deudas con una persona" };

export default async function PersonDebtsPage({ params }: PageProps<"/debts/[personId]">) {
  const { personId } = await params;
  if (!isUuid(personId)) notFound();
  const user = await requireUser();
  const [data, accounts, categories] = await Promise.all([
    getPersonWithDebts(user.id, personId),
    listAccounts(user.id),
    getCategoryTree(user.id, { kind: "EXPENSE" }),
  ]);
  if (!data) notFound();
  const { person, debts, balances } = data;
  const today = todayIn(user.timezone);

  return (
    <>
      <PageHeader
        back={{ href: "/debts", label: "Deudas" }}
        title={person.name}
        description={
          <>
            {person.note ? <p className="mb-1">{person.note}</p> : null}
            <BalanceLines balances={balances} />
          </>
        }
        actions={
          <>
            <FormDialog
              trigger="Nueva deuda"
              title={`Nueva deuda con ${person.name}`}
              size="lg"
              icon={<Plus className="size-4" />}
            >
              <DebtForm
                people={[person]}
                personId={person.id}
                accounts={accounts}
                categories={categories}
                baseCurrency={user.baseCurrency}
                today={today}
              />
            </FormDialog>
            <FormDialog
              trigger="Editar"
              title="Editar persona"
              variant="secondary"
              icon={<Pencil className="size-4" />}
            >
              <PersonForm action={updatePersonAction.bind(null, person.id)} person={person} />
            </FormDialog>
            <InlineAction
              action={deletePersonAction.bind(null, person.id)}
              label="Eliminar persona"
              variant="danger"
              confirm={`¿Eliminar a ${person.name} con todas sus deudas, abonos y movimientos asociados?`}
            />
          </>
        }
      />
      <div className="max-w-4xl">
        <DebtList debts={debts} accounts={accounts} today={today} />
      </div>
    </>
  );
}
