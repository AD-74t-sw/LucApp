import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Badge, EmptyState, InlineAction } from "@/shared/ui";
import type { Card } from "../domain/card";
import { deleteCardAction, toggleCardArchivedAction } from "./actions";
import { CardNetworkLogo } from "./card-network-logo";
import { CARD_KIND_LABELS } from "./labels";

export function CardList({ cards }: { cards: readonly Card[] }) {
  if (cards.length === 0) {
    return (
      <EmptyState title="Sin tarjetas" description="Agrega las tarjetas asociadas a esta cuenta." />
    );
  }
  return (
    <ul className="divide-border divide-y">
      {cards.map((card) => (
        <li key={card.id} className="flex flex-wrap items-center gap-2 py-2.5">
          <span className="font-medium">{card.name}</span>
          <Badge tone={card.kind === "CREDIT" ? "accent" : "neutral"}>
            {CARD_KIND_LABELS[card.kind]}
          </Badge>
          <CardNetworkLogo network={card.network} height={22} />
          {card.last4 ? (
            <span className="text-muted tabular text-sm">•••• {card.last4}</span>
          ) : null}
          {card.archived ? <Badge tone="warning">Archivada</Badge> : null}
          <div className="ml-auto flex items-center gap-1">
            <InlineAction
              action={toggleCardArchivedAction.bind(null, card.id, !card.archived)}
              label={card.archived ? "Restaurar" : "Archivar"}
              icon={
                card.archived ? (
                  <ArchiveRestore className="size-4" />
                ) : (
                  <Archive className="size-4" />
                )
              }
            />
            <InlineAction
              action={deleteCardAction.bind(null, card.id)}
              label="Eliminar"
              confirm={`¿Eliminar la tarjeta ${card.name}? Sus movimientos se conservan sin tarjeta asociada.`}
              icon={<Trash2 className="size-4" />}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
