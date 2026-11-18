import { Suspense } from "react";
import { RouteDialog } from "@/shared/ui";
import { NewTransaction } from "../../../transactions/new/new-transaction";
import { DialogSkeleton } from "../../dialog-skeleton";

export default function NewTransactionDialog({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <RouteDialog title="Nuevo movimiento" size="lg">
      <Suspense fallback={<DialogSkeleton />}>
        <NewTransaction searchParams={searchParams} />
      </Suspense>
    </RouteDialog>
  );
}
