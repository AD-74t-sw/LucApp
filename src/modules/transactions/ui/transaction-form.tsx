"use client";

import { useState } from "react";
import type { Account, Card } from "@/modules/accounts";
import type { CategoryNode } from "@/modules/categories";
import { CategorySelect, ClassificationFields } from "@/modules/categories/ui";
import { type CurrencyCode, type LocalDate, toDecimalString } from "@/shared/domain";
import {
  type ActionState,
  Field,
  FormAlert,
  ActionForm,
  useFormAction,
  Input,
  SubmitButton,
  Textarea,
  fieldError,
  CancelButton,
} from "@/shared/ui";
import type { Transaction } from "../domain/transaction";
import { AccountCurrencyField, AccountSelect, CardSelect } from "@/modules/accounts/ui";

/** Starting values for a new movement (for example, read from a bank notice). */
export type MovementDefaults = Partial<{
  amount: string;
  date: LocalDate;
  description: string;
  categoryId: string;
  accountId: string;
  cardId: string;
  currency: CurrencyCode;
}>;

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  kind: "EXPENSE" | "INCOME";
  accounts: readonly Account[];
  cards: readonly Card[];
  /** Categories of the same kind as the movement. */
  categories: readonly CategoryNode[];
  today: LocalDate;
  /** Present when editing. */
  transaction?: Transaction;
  defaults?: MovementDefaults;
  submitLabel?: string;
};

/** Expense or income form. Expenses also take a card and their classification. */
export function TransactionForm({
  action,
  kind,
  accounts,
  cards,
  categories,
  today,
  transaction,
  defaults,
  submitLabel,
}: Props) {
  const form = useFormAction(action);
  const { state } = form;
  const [accountId, setAccountId] = useState(
    transaction?.accountId ?? defaults?.accountId ?? accounts[0]?.id ?? "",
  );
  const account = accounts.find((a) => a.id === accountId);
  const [chosenCurrency, setCurrency] = useState<CurrencyCode | undefined>(
    transaction?.currency ?? defaults?.currency,
  );
  // The chosen currency must be one the selected account operates in.
  const currency =
    account && (chosenCurrency === account.currency || chosenCurrency === account.secondaryCurrency)
      ? chosenCurrency
      : (account?.currency ?? "CLP");
  const accountCards = cards.filter((card) => card.accountId === accountId);
  const isExpense = kind === "EXPENSE";

  return (
    <ActionForm form={form} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <div className="grid gap-4 @md:grid-cols-2">
        <Field label="Monto" htmlFor="amount" error={fieldError(state, "amount")}>
          <div className="flex items-center gap-2">
            <Input
              id="amount"
              name="amount"
              inputMode="decimal"
              autoFocus={!transaction && !defaults}
              required
              defaultValue={
                transaction
                  ? toDecimalString(Math.abs(transaction.amount), transaction.currency)
                  : defaults?.amount
              }
              placeholder="0"
              className="text-lg font-medium"
            />
            <span className="text-muted w-10 text-sm">{currency}</span>
          </div>
        </Field>
        <Field label="Fecha" htmlFor="date" error={fieldError(state, "date")}>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={transaction?.date ?? defaults?.date ?? today}
          />
        </Field>
        <Field
          label="Descripción"
          htmlFor="description"
          error={fieldError(state, "description")}
          className="@md:col-span-2"
        >
          <Input
            id="description"
            name="description"
            required
            maxLength={120}
            defaultValue={transaction?.description ?? defaults?.description}
            placeholder={isExpense ? "Supermercado, bencina…" : "Sueldo de noviembre…"}
          />
        </Field>
        <Field label="Categoría" htmlFor="categoryId" error={fieldError(state, "categoryId")}>
          <CategorySelect
            id="categoryId"
            name="categoryId"
            tree={categories}
            required
            defaultValue={transaction?.categoryId ?? defaults?.categoryId ?? ""}
          />
        </Field>
        <Field label="Cuenta" htmlFor="accountId" error={fieldError(state, "accountId")}>
          <AccountSelect
            id="accountId"
            name="accountId"
            accounts={accounts}
            required
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
          />
        </Field>
        <div className="@md:col-span-2">
          <AccountCurrencyField account={account} value={currency} onChange={setCurrency} />
          {fieldError(state, "currency") ? (
            <p className="text-negative mt-1 text-xs">{fieldError(state, "currency")}</p>
          ) : null}
        </div>
        {isExpense && accountCards.length > 0 ? (
          <Field label="Tarjeta" htmlFor="cardId" error={fieldError(state, "cardId")}>
            <CardSelect
              id="cardId"
              name="cardId"
              cards={accountCards}
              key={accountId}
              defaultValue={
                transaction?.cardId ??
                (accountId === defaults?.accountId ? defaults?.cardId : "") ??
                ""
              }
            />
          </Field>
        ) : null}
      </div>

      {isExpense ? (
        <fieldset className="border-border flex flex-col gap-3 rounded-xs border p-4">
          <legend className="px-1 text-sm font-medium">Clasificación del gasto</legend>
          <ClassificationFields
            costTypeName="costType"
            necessityName="necessity"
            defaultCostType={transaction?.costType}
            defaultNecessity={transaction?.necessity}
            emptyLabel="Según la categoría"
            errors={{
              costType: fieldError(state, "costType"),
              necessity: fieldError(state, "necessity"),
            }}
          />
        </fieldset>
      ) : null}

      <Field label="Nota (opcional)" htmlFor="note" error={fieldError(state, "note")}>
        <Textarea
          id="note"
          name="note"
          maxLength={500}
          defaultValue={transaction?.note ?? undefined}
        />
      </Field>

      <div className="flex gap-2">
        <SubmitButton>
          {submitLabel ??
            (transaction ? "Guardar cambios" : isExpense ? "Registrar gasto" : "Registrar ingreso")}
        </SubmitButton>
        <CancelButton href="/transactions" />
      </div>
    </ActionForm>
  );
}
