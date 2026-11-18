import Link from "next/link";
import { Archive, ArchiveRestore, Pencil, Plus } from "lucide-react";
import { Badge, ColorDot, EmptyState, InlineAction } from "@/shared/ui";
import type { Category, CategoryNode } from "../domain/category";
import { toggleCategoryArchivedAction } from "./actions";
import { COST_TYPE_LABELS, NECESSITY_LABELS } from "./labels";

function ClassificationBadges({ category }: { category: Category }) {
  return (
    <>
      {category.defaultCostType ? (
        <Badge>{COST_TYPE_LABELS[category.defaultCostType]}</Badge>
      ) : null}
      {category.defaultNecessity ? (
        <Badge tone={category.defaultNecessity === "ESSENTIAL" ? "accent" : "warning"}>
          {NECESSITY_LABELS[category.defaultNecessity]}
        </Badge>
      ) : null}
    </>
  );
}

function Row({ category, nested }: { category: Category; nested?: boolean }) {
  return (
    <div
      className={
        nested
          ? "flex flex-wrap items-center gap-2 py-2 pl-7"
          : "flex flex-wrap items-center gap-2 py-2.5"
      }
    >
      <ColorDot color={category.color} />
      <Link
        href={`/categories/${category.id}`}
        className={nested ? "text-sm hover:underline" : "font-medium hover:underline"}
      >
        {category.name}
      </Link>
      {category.archived ? <Badge tone="warning">Archivada</Badge> : null}
      <ClassificationBadges category={category} />
      <div className="ml-auto flex items-center gap-1">
        {nested || category.archived ? null : (
          <Link
            href={`/categories/new?kind=${category.kind}&parentId=${category.id}`}
            aria-label={`Agregar subcategoría a ${category.name}`}
            title={`Agregar subcategoría a ${category.name}`}
            className="text-muted hover:bg-surface-muted hover:text-foreground flex items-center gap-1 rounded-xs px-2 py-1.5 text-sm"
          >
            <Plus className="size-4" aria-hidden />
            <span className="hidden sm:inline">Subcategoría</span>
          </Link>
        )}
        <Link
          href={`/categories/${category.id}`}
          aria-label={`Editar ${category.name}`}
          className="text-muted hover:bg-surface-muted hover:text-foreground rounded-xs p-1.5"
        >
          <Pencil className="size-4" />
        </Link>
        <InlineAction
          action={toggleCategoryArchivedAction.bind(null, category.id, !category.archived)}
          label={category.archived ? "Restaurar" : "Archivar"}
          icon={
            category.archived ? (
              <ArchiveRestore className="size-4" />
            ) : (
              <Archive className="size-4" />
            )
          }
        />
      </div>
    </div>
  );
}

export function CategoryTreeList({ tree }: { tree: readonly CategoryNode[] }) {
  if (tree.length === 0) {
    return <EmptyState title="Aún no hay categorías de este tipo." />;
  }
  return (
    <div className="divide-border divide-y">
      {tree.map((node) => (
        <div key={node.id}>
          <Row category={node} />
          {node.children.map((child) => (
            <Row key={child.id} category={child} nested />
          ))}
        </div>
      ))}
    </div>
  );
}
