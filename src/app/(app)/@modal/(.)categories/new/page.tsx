import { Suspense } from "react";
import { RouteDialog } from "@/shared/ui";
import { NewCategory } from "../../../categories/new/new-category";
import { DialogSkeleton } from "../../dialog-skeleton";

export default function NewCategoryDialog({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <RouteDialog title="Nueva categoría" size="lg">
      <Suspense fallback={<DialogSkeleton />}>
        <NewCategory searchParams={searchParams} />
      </Suspense>
    </RouteDialog>
  );
}
