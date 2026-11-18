import type { Metadata } from "next";
import { Card, PageHeader } from "@/shared/ui";
import { NewCategory } from "./new-category";

export const metadata: Metadata = { title: "Nueva categoría" };

export default function NewCategoryPage({ searchParams }: PageProps<"/categories/new">) {
  return (
    <>
      <PageHeader title="Nueva categoría" back={{ href: "/categories", label: "Categorías" }} />
      <Card className="max-w-3xl">
        <NewCategory searchParams={searchParams} />
      </Card>
    </>
  );
}
