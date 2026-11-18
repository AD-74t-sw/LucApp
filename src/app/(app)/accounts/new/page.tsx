import type { Metadata } from "next";
import { Card, PageHeader } from "@/shared/ui";
import { NewAccount } from "./new-account";

export const metadata: Metadata = { title: "Nueva cuenta" };

export default function NewAccountPage() {
  return (
    <>
      <PageHeader title="Nueva cuenta" back={{ href: "/accounts", label: "Cuentas" }} />
      <Card className="max-w-3xl">
        <NewAccount />
      </Card>
    </>
  );
}
