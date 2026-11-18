import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requireUser } from "@/modules/identity";
import { listInstallmentPlans } from "@/modules/transactions";
import { InstallmentPlanList } from "@/modules/transactions/ui";
import { today } from "@/shared/domain";
import { ButtonLink, PageHeader } from "@/shared/ui";
import { MORE_BACK } from "../nav-items";

export const metadata: Metadata = { title: "Compras en cuotas" };

export default async function InstallmentsPage() {
  const user = await requireUser();
  const plans = await listInstallmentPlans(user.id, today(user.timezone));
  return (
    <>
      <PageHeader
        back={MORE_BACK}
        title="Compras en cuotas"
        description="Cada cuota se registra como un gasto en su mes."
        actions={
          <ButtonLink href="/transactions/new?type=installments" size="sm">
            <Plus className="size-4" /> Nueva compra en cuotas
          </ButtonLink>
        }
      />
      <InstallmentPlanList plans={plans} />
    </>
  );
}
