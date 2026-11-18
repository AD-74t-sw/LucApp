import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { listAccounts } from "@/modules/accounts";
import { AccountGrid } from "@/modules/accounts/ui";
import { requireUser } from "@/modules/identity";
import { getAccountBalances } from "@/modules/transactions";
import { today } from "@/shared/domain";
import { ButtonLink, EmptyState, PageHeader } from "@/shared/ui";
import { MORE_BACK } from "../nav-items";

export const metadata: Metadata = { title: "Cuentas" };

export default async function AccountsPage({ searchParams }: PageProps<"/accounts">) {
  const user = await requireUser();
  const showArchived = (await searchParams).archived === "1";
  const [accounts, balances] = await Promise.all([
    listAccounts(user.id, { includeArchived: showArchived }),
    getAccountBalances(user.id, today(user.timezone)),
  ]);

  return (
    <>
      <PageHeader
        back={MORE_BACK}
        title="Cuentas y tarjetas"
        description="Cuentas bancarias, efectivo, billeteras y tarjetas de crédito."
        actions={
          <>
            <ButtonLink
              href={showArchived ? "/accounts" : "/accounts?archived=1"}
              variant="ghost"
              size="sm"
            >
              {showArchived ? "Ocultar archivadas" : "Ver archivadas"}
            </ButtonLink>
            <ButtonLink href="/accounts/new" size="sm">
              <Plus className="size-4" /> Nueva cuenta
            </ButtonLink>
          </>
        }
      />
      {accounts.length === 0 ? (
        <EmptyState
          title="Todavía no tienes cuentas"
          description="Crea tu cuenta corriente, tu efectivo o tu tarjeta de crédito para empezar a registrar movimientos."
          action={<ButtonLink href="/accounts/new">Crear cuenta</ButtonLink>}
        />
      ) : (
        <AccountGrid accounts={accounts} balances={balances} />
      )}
    </>
  );
}
