import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { getAccount, isCreditAccount, listCards } from "@/modules/accounts";
import {
  ACCOUNT_TYPE_LABELS,
  CardForm,
  CardList,
  CreditUsage,
  DebtLine,
  InstitutionLogo,
  createCardAction,
  deleteAccountAction,
  toggleAccountArchivedAction,
} from "@/modules/accounts/ui";
import { requireUser } from "@/modules/identity";
import { getAccountBalances, listTransactions } from "@/modules/transactions";
import { TransactionList } from "@/modules/transactions/ui";
import { isUuid, today as todayIn } from "@/shared/domain";
import {
  ButtonLink,
  Card,
  CardTitle,
  FormDialog,
  InlineAction,
  MoneyText,
  PageHeader,
  formatMoney,
} from "@/shared/ui";

export const metadata: Metadata = { title: "Cuenta" };

export default async function AccountPage({ params }: PageProps<"/accounts/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const user = await requireUser();
  const account = await getAccount(user.id, id);
  if (!account) notFound();

  const today = todayIn(user.timezone);
  const [balances, cards, recent] = await Promise.all([
    getAccountBalances(user.id, today),
    listCards(user.id, { includeArchived: true }),
    listTransactions(user.id, { accountId: account.id, page: 1 }, today),
  ]);
  const balance = balances.get(account.id) ?? {
    accountId: account.id,
    currency: account.currency,
    posted: account.openingBalance,
    scheduled: 0,
    secondary: null,
  };
  const credit = isCreditAccount(account.type);

  return (
    <>
      <PageHeader
        back={{ href: "/accounts", label: "Cuentas" }}
        title={account.name}
        description={
          <span className="flex items-center gap-2">
            <InstitutionLogo name={account.institution} size={24} />
            {ACCOUNT_TYPE_LABELS[account.type]}
            {account.institution ? ` · ${account.institution}` : ""} · {account.currency}
            {account.secondaryCurrency ? ` + ${account.secondaryCurrency}` : ""}
          </span>
        }
        actions={
          <>
            <ButtonLink href={`/accounts/${account.id}/edit`} variant="secondary" size="sm">
              <Pencil className="size-4" /> Editar
            </ButtonLink>
            <InlineAction
              action={toggleAccountArchivedAction.bind(null, account.id, !account.archived)}
              label={account.archived ? "Restaurar" : "Archivar"}
              variant="secondary"
            />
            <InlineAction
              action={deleteAccountAction.bind(null, account.id)}
              label="Eliminar"
              variant="danger"
              confirm="¿Eliminar esta cuenta? Solo es posible si no tiene movimientos."
            />
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col gap-3">
          <p className="eyebrow">{credit ? "Deuda actual" : "Saldo actual"}</p>
          {credit ? (
            <>
              <DebtLine amounts={balance} currency={account.currency} />
              {balance.secondary ? (
                <DebtLine amounts={balance.secondary} currency={balance.secondary.currency} />
              ) : null}
            </>
          ) : (
            <>
              <MoneyText
                amount={balance.posted}
                currency={account.currency}
                className="text-3xl font-medium tracking-[-0.03em]"
              />
              {balance.scheduled !== 0 ? (
                <p className="text-muted text-sm">
                  Movimientos programados:{" "}
                  {formatMoney(balance.scheduled, account.currency, { signDisplay: "exceptZero" })}
                </p>
              ) : null}
            </>
          )}
          {credit ? (
            <>
              <CreditUsage account={account} balance={balance} />
              <p className="text-muted text-xs">
                Cupo {formatMoney(account.creditLimit ?? 0, account.currency)}
                {account.secondaryCurrency && account.secondaryCreditLimit
                  ? ` + ${formatMoney(account.secondaryCreditLimit, account.secondaryCurrency)} ${account.secondaryCurrency}`
                  : ""}
                {account.closingDay ? ` · factura el día ${account.closingDay}` : ""}
                {account.dueDay ? ` · paga el día ${account.dueDay}` : ""}
              </p>
            </>
          ) : null}
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle
            description={
              credit
                ? "Tarjetas de crédito (titular y adicionales)."
                : "Tarjetas de débito asociadas."
            }
            action={
              account.type !== "CASH" && !account.archived ? (
                <FormDialog
                  trigger="Agregar tarjeta"
                  title="Agregar tarjeta"
                  description={`A la cuenta ${account.name}.`}
                  variant="secondary"
                  icon={<Plus className="size-4" />}
                >
                  <CardForm action={createCardAction} accountId={account.id} />
                </FormDialog>
              ) : null
            }
          >
            Tarjetas
          </CardTitle>
          {account.type === "CASH" ? (
            <p className="text-muted text-sm">El efectivo no tiene tarjetas.</p>
          ) : (
            <CardList cards={cards.filter((c) => c.accountId === account.id)} />
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle
          action={
            <ButtonLink href={`/transactions?accountId=${account.id}`} variant="ghost" size="sm">
              Ver todos
            </ButtonLink>
          }
        >
          Últimos movimientos
        </CardTitle>
        <TransactionList items={recent.items.slice(0, 10)} today={today} />
      </Card>
    </>
  );
}
