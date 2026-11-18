"use client";

import { useState } from "react";
import type { Account, Card } from "@/modules/accounts";
import type { CategoryNode } from "@/modules/categories";
import { type MovementDefaults, TransactionForm, TransferForm } from "@/modules/transactions/ui";
import type { LocalDate } from "@/shared/domain";
import { type ActionState, cn } from "@/shared/ui";
import type { ReviewKind } from "../application/suggestions";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

const KINDS: readonly { kind: ReviewKind; label: string }[] = [
  { kind: "EXPENSE", label: "Gasto" },
  { kind: "INCOME", label: "Ingreso" },
  { kind: "TRANSFER", label: "Entre mis cuentas" },
];

/**
 * Records a bank notice as an expense, an income or a transfer between own
 * accounts. Starts on the suggested kind with the notice's values filled in.
 */
export function ReviewForms({
  initialKind,
  actions,
  movement,
  transfer,
  accounts,
  cards,
  expenseCategories,
  incomeCategories,
  today,
  referenceRate,
}: {
  initialKind: ReviewKind;
  actions: Record<ReviewKind, FormAction>;
  /** Defaults for an expense or income. */
  movement: MovementDefaults;
  /** Defaults for a transfer. */
  transfer: {
    fromAccountId?: string;
    toAccountId?: string;
    amount?: string;
    date?: LocalDate;
    description?: string;
  };
  accounts: readonly Account[];
  cards: readonly Card[];
  expenseCategories: readonly CategoryNode[];
  incomeCategories: readonly CategoryNode[];
  today: LocalDate;
  referenceRate: { rate: number; date: LocalDate } | null;
}) {
  const [kind, setKind] = useState<ReviewKind>(initialKind);
  return (
    <div className="flex flex-col gap-5">
      <div role="radiogroup" aria-label="Registrar como" className="border-border flex border">
        {KINDS.map((option) => (
          <button
            key={option.kind}
            type="button"
            role="radio"
            aria-checked={kind === option.kind}
            onClick={() => setKind(option.kind)}
            className={cn(
              "flex-1 px-3 py-2 text-sm transition",
              kind === option.kind
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      {kind === "TRANSFER" ? (
        <TransferForm
          action={actions.TRANSFER}
          accounts={accounts}
          today={today}
          referenceRate={referenceRate}
          defaults={transfer}
        />
      ) : (
        <TransactionForm
          // Remount when switching, so each kind starts from the notice's values.
          key={kind}
          action={actions[kind]}
          kind={kind}
          accounts={accounts}
          cards={cards}
          categories={kind === "EXPENSE" ? expenseCategories : incomeCategories}
          today={today}
          defaults={
            kind === initialKind
              ? movement
              : { ...movement, categoryId: undefined, cardId: undefined }
          }
        />
      )}
    </div>
  );
}
