import { Archive, ArchiveRestore, Bell, BellOff, Pencil, Trash2 } from "lucide-react";
import { Badge, Card, EmptyState, InlineAction, FormDialog } from "@/shared/ui";
import type { MealBlock } from "../domain/block";
import type { FoodCategory } from "../domain/food";
import { deleteBlockAction, toggleBlockArchivedAction, updateBlockAction } from "./actions";
import { BlockForm } from "./block-form";
import { formatNumber } from "./format";

/** The day's blocks in order, with what each one asks for. */
export function BlockList({
  blocks,
  categories,
}: {
  /** Including archived ones. */
  blocks: readonly MealBlock[];
  categories: readonly FoodCategory[];
}) {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const active = blocks.filter((b) => !b.archived);
  const archived = blocks.filter((b) => b.archived);
  if (blocks.length === 0) {
    return (
      <EmptyState
        title="Sin bloques"
        description="Crea las comidas de tu día (desayuno, almuerzo, once, cena) con su horario y cuántas porciones de cada categoría llevan."
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {active.map((block) => (
        <Card key={block.id} aria-label={block.name} className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{block.name}</p>
              <span className="text-muted font-mono text-xs">
                {block.startTime}–{block.endTime}
              </span>
              {block.notify ? (
                <Bell className="text-muted size-3.5" aria-label="Con aviso" />
              ) : (
                <BellOff className="text-muted size-3.5" aria-label="Sin aviso" />
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {block.portions.map((portion) => (
                <Badge key={portion.categoryId}>
                  {names.get(portion.categoryId) ?? "Categoría archivada"} ×
                  {formatNumber(portion.servings)}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <FormDialog
              trigger={null}
              title="Editar bloque"
              description={block.name}
              variant="ghost"
              buttonSize="icon"
              ariaLabel={`Editar ${block.name}`}
              icon={<Pencil className="size-4" />}
              size="lg"
            >
              <BlockForm
                action={updateBlockAction.bind(null, block.id)}
                block={block}
                categories={categories}
              />
            </FormDialog>
            <InlineAction
              action={toggleBlockArchivedAction.bind(null, block.id, true)}
              label=""
              icon={<Archive className="size-4" aria-label={`Archivar ${block.name}`} />}
            />
            <InlineAction
              action={deleteBlockAction.bind(null, block.id)}
              label=""
              confirm={`¿Eliminar el bloque ${block.name}?`}
              icon={<Trash2 className="size-4" aria-label={`Eliminar ${block.name}`} />}
            />
          </div>
        </Card>
      ))}
      {archived.length > 0 ? (
        <details className="border-border rounded-xs border px-4 py-3">
          <summary className="text-muted cursor-pointer text-sm">
            Archivados ({archived.length})
          </summary>
          <ul className="divide-border mt-2 divide-y">
            {archived.map((block) => (
              <li key={block.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>
                  {block.name}{" "}
                  <span className="text-muted font-mono text-xs">
                    {block.startTime}–{block.endTime}
                  </span>
                </span>
                <InlineAction
                  action={toggleBlockArchivedAction.bind(null, block.id, false)}
                  label="Restaurar"
                  icon={<ArchiveRestore className="size-4" />}
                />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
