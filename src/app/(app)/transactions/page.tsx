import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { listAccounts, listCards } from "@/modules/accounts";
import { getCategoryTree } from "@/modules/categories";
import { requireUser } from "@/modules/identity";
import { listTransactions, transactionFiltersSchema } from "@/modules/transactions";
import { TransactionFilters, TransactionList } from "@/modules/transactions/ui";
import { today } from "@/shared/domain";
import { ButtonLink, Card, PageHeader, Pagination, Tabs } from "@/shared/ui";

export const metadata: Metadata = { title: "Movimientos" };

export default async function TransactionsPage({ searchParams }: PageProps<"/transactions">) {
  const user = await requireUser();
  const raw = await searchParams;
  const filters = transactionFiltersSchema.parse(
    Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])),
  );
  const todayDate = today(user.timezone);
  const [page, accounts, cards, categories] = await Promise.all([
    listTransactions(user.id, filters, todayDate),
    listAccounts(user.id, { includeArchived: true }),
    listCards(user.id, { includeArchived: true }),
    getCategoryTree(user.id, { includeArchived: true }),
  ]);
  const { page: _page, ...params } = filters;

  return (
    <>
      <PageHeader
        title="Movimientos"
        description={`${page.total} movimientos`}
        actions={
          <ButtonLink href="/transactions/new" size="sm">
            <Plus className="size-4" /> Nuevo
          </ButtonLink>
        }
      />
      <Tabs
        label="Período"
        items={[
          { href: "/transactions", label: "Realizados", active: filters.scheduled === undefined },
          {
            href: "/transactions?scheduled=only",
            label: "Programados",
            active: filters.scheduled === "only",
          },
        ]}
      />
      <details
        className="border-border bg-surface mb-4 rounded-xs border p-4"
        open={Object.keys(raw).length > 0}
      >
        <summary className="cursor-pointer text-sm font-medium">Filtros</summary>
        <div className="mt-4">
          <TransactionFilters
            filters={filters}
            accounts={accounts}
            cards={cards}
            categories={categories}
          />
        </div>
      </details>
      <Card>
        <TransactionList items={page.items} today={todayDate} />
        <Pagination
          page={page.page}
          pageCount={page.pageCount}
          basePath="/transactions"
          params={Object.fromEntries(
            Object.entries(params).map(([k, v]) => [k, v === undefined ? undefined : String(v)]),
          )}
        />
      </Card>
    </>
  );
}
