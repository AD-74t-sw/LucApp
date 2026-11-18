import { AccountForm, createAccountAction } from "@/modules/accounts/ui";
import { requireUser } from "@/modules/identity";

/** "New account" content, shared by the full page and the dialog. */
export async function NewAccount() {
  const user = await requireUser();
  return <AccountForm action={createAccountAction} defaultCurrency={user.baseCurrency} />;
}
