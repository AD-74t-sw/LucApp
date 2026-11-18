import { Suspense } from "react";
import { RouteDialog } from "@/shared/ui";
import { NewAccount } from "../../../accounts/new/new-account";
import { DialogSkeleton } from "../../dialog-skeleton";

/** /accounts/new opened from inside the app: shown as a dialog over the current page. */
export default function NewAccountDialog() {
  return (
    <RouteDialog title="Nueva cuenta" size="lg">
      <Suspense fallback={<DialogSkeleton />}>
        <NewAccount />
      </Suspense>
    </RouteDialog>
  );
}
