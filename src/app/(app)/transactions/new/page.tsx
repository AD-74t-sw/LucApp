import type { Metadata } from "next";
import { Card, PageHeader } from "@/shared/ui";
import { NewTransaction } from "./new-transaction";

export const metadata: Metadata = { title: "Nuevo movimiento" };

/** Full page (direct visits); in-app links open the same content in a dialog. */
export default function NewTransactionPage({ searchParams }: PageProps<"/transactions/new">) {
  return (
    <>
      <PageHeader title="Nuevo movimiento" back={{ href: "/transactions", label: "Movimientos" }} />
      <Card className="max-w-3xl">
        <NewTransaction searchParams={searchParams} />
      </Card>
    </>
  );
}
