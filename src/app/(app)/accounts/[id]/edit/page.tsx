import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAccount } from "@/modules/accounts";
import { AccountForm, updateAccountAction } from "@/modules/accounts/ui";
import { requireUser } from "@/modules/identity";
import { isUuid } from "@/shared/domain";
import { Card, PageHeader } from "@/shared/ui";

export const metadata: Metadata = { title: "Editar cuenta" };

export default async function EditAccountPage({ params }: PageProps<"/accounts/[id]/edit">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const user = await requireUser();
  const account = await getAccount(user.id, id);
  if (!account) notFound();
  return (
    <>
      <PageHeader
        title={`Editar ${account.name}`}
        back={{ href: `/accounts/${account.id}`, label: account.name }}
      />
      <Card className="max-w-3xl">
        <AccountForm
          action={updateAccountAction.bind(null, account.id)}
          account={account}
          defaultCurrency={account.currency}
        />
      </Card>
    </>
  );
}
