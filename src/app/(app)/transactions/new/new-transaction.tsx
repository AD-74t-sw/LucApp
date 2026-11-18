import { listAccounts, listCards } from "@/modules/accounts";
import { getCategoryTree } from "@/modules/categories";
import { getCurrentRate } from "@/modules/currencies";
import { requireUser } from "@/modules/identity";
import {
  InstallmentForm,
  TransactionForm,
  TransferForm,
  createInstallmentPurchaseAction,
  recordExpenseAction,
  recordIncomeAction,
  recordTransferAction,
} from "@/modules/transactions/ui";
import { today as todayIn } from "@/shared/domain";
import { ButtonLink, EmptyState, Tabs } from "@/shared/ui";

const TABS = [
  { type: "expense", label: "Gasto" },
  { type: "income", label: "Ingreso" },
  { type: "transfer", label: "Transferencia" },
  { type: "installments", label: "En cuotas" },
] as const;

type TabType = (typeof TABS)[number]["type"];

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * "New movement" content, shared by the full page and the dialog opened over
 * any page (intercepted route). The tab lives in the URL (?type=…).
 */
export async function NewTransaction({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const requested = (await searchParams).type;
  const type: TabType = TABS.some((t) => t.type === requested) ? (requested as TabType) : "expense";
  const [accounts, cards, expenseTree, incomeTree] = await Promise.all([
    listAccounts(user.id),
    listCards(user.id),
    getCategoryTree(user.id, { kind: "EXPENSE" }),
    getCategoryTree(user.id, { kind: "INCOME" }),
  ]);
  const today = todayIn(user.timezone);

  if (accounts.length === 0) {
    return (
      <EmptyState
        title="Primero crea una cuenta"
        description="Los movimientos siempre ocurren en una cuenta: corriente, efectivo o tarjeta de crédito."
        action={<ButtonLink href="/accounts/new">Crear cuenta</ButtonLink>}
      />
    );
  }

  return (
    <>
      <Tabs
        label="Tipo de movimiento"
        // Switching tabs must not add history: "back" closes the dialog.
        replace
        items={TABS.map((tab) => ({
          href: `/transactions/new?type=${tab.type}`,
          label: tab.label,
          active: tab.type === type,
        }))}
      />
      {type === "expense" ? (
        <TransactionForm
          action={recordExpenseAction}
          kind="EXPENSE"
          accounts={accounts}
          cards={cards}
          categories={expenseTree}
          today={today}
        />
      ) : type === "income" ? (
        <TransactionForm
          action={recordIncomeAction}
          kind="INCOME"
          accounts={accounts}
          cards={cards}
          categories={incomeTree}
          today={today}
        />
      ) : type === "transfer" ? (
        <TransferForm
          action={recordTransferAction}
          accounts={accounts}
          today={today}
          referenceRate={await getCurrentRate()}
        />
      ) : (
        <InstallmentForm
          action={createInstallmentPurchaseAction}
          accounts={accounts}
          cards={cards}
          categories={expenseTree}
          today={today}
        />
      )}
    </>
  );
}
