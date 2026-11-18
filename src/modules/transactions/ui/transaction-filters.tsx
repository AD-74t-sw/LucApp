import type { Account, Card } from "@/modules/accounts";
import type { CategoryNode } from "@/modules/categories";
import {
  COST_TYPES,
  COST_TYPE_LABELS,
  NECESSITIES,
  NECESSITY_LABELS,
} from "@/modules/categories/ui";
import { Button, ButtonLink, Field, Input, Select } from "@/shared/ui";
import type { TransactionFiltersInput } from "../application/transaction-schemas";
import { TRANSACTION_KINDS } from "../domain/transaction";
import { AccountSelect } from "@/modules/accounts/ui";
import { TRANSACTION_KIND_LABELS } from "./labels";

/** Plain GET form: filters live in the URL, so they can be shared and work without JavaScript. */
export function TransactionFilters({
  filters,
  accounts,
  cards,
  categories,
}: {
  filters: TransactionFiltersInput;
  accounts: readonly Account[];
  cards: readonly Card[];
  categories: readonly CategoryNode[];
}) {
  return (
    <form method="get" action="/transactions" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Buscar" htmlFor="q">
        <Input id="q" name="q" defaultValue={filters.q} placeholder="Descripción…" />
      </Field>
      <Field label="Desde" htmlFor="from">
        <Input id="from" name="from" type="date" defaultValue={filters.from} />
      </Field>
      <Field label="Hasta" htmlFor="to">
        <Input id="to" name="to" type="date" defaultValue={filters.to} />
      </Field>
      <Field label="Tipo" htmlFor="kind">
        <Select id="kind" name="kind" defaultValue={filters.kind ?? ""}>
          <option value="">Todos</option>
          {TRANSACTION_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {TRANSACTION_KIND_LABELS[kind]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Cuenta" htmlFor="accountId">
        <AccountSelect
          id="accountId"
          name="accountId"
          accounts={accounts}
          placeholder="Todas"
          defaultValue={filters.accountId ?? ""}
        />
      </Field>
      <Field label="Tarjeta" htmlFor="cardId">
        <Select id="cardId" name="cardId" defaultValue={filters.cardId ?? ""}>
          <option value="">Todas</option>
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Categoría" htmlFor="categoryId">
        <Select id="categoryId" name="categoryId" defaultValue={filters.categoryId ?? ""}>
          <option value="">Todas</option>
          {categories.map((parent) => (
            <optgroup key={parent.id} label={parent.name}>
              <option value={parent.id}>{parent.name} (todas)</option>
              {parent.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo de gasto" htmlFor="costType">
          <Select id="costType" name="costType" defaultValue={filters.costType ?? ""}>
            <option value="">Todos</option>
            {COST_TYPES.map((value) => (
              <option key={value} value={value}>
                {COST_TYPE_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Necesidad" htmlFor="necessity">
          <Select id="necessity" name="necessity" defaultValue={filters.necessity ?? ""}>
            <option value="">Todas</option>
            {NECESSITIES.map((value) => (
              <option key={value} value={value}>
                {NECESSITY_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="submit" variant="secondary" size="sm">
          Filtrar
        </Button>
        <ButtonLink href="/transactions" variant="ghost" size="sm">
          Limpiar
        </ButtonLink>
      </div>
    </form>
  );
}
