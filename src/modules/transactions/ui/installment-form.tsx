"use client";

import { useState } from "react";
import type { Account, Card } from "@/modules/accounts";
import type { CategoryNode } from "@/modules/categories";
import { CategorySelect, ClassificationFields } from "@/modules/categories/ui";
import {
  type CurrencyCode,
  type LocalDate,
  addMonths,
  parseAmount,
  splitEvenly,
} from "@/shared/domain";
import {
  type ActionState,
  Field,
  FormAlert,
  ActionForm,
  useFormAction,
  Input,
  SubmitButton,
  fieldError,
  formatDate,
  formatMoney,
  CancelButton,
} from "@/shared/ui";
import { MAX_INSTALLMENTS } from "../domain/installment-schedule";
import { AccountCurrencyField, AccountSelect, CardSelect } from "@/modules/accounts/ui";

export function InstallmentForm({
  action,
  accounts,
  cards,
  categories,
  today,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  accounts: readonly Account[];
  cards: readonly Card[];
  categories: readonly CategoryNode[];
  today: LocalDate;
}) {
  const form = useFormAction(action);
  const { state } = form;
  const [accountId, setAccountId] = useState(
    accounts.find((a) => a.type === "CREDIT_CARD")?.id ?? accounts[0]?.id ?? "",
  );
  const [total, setTotal] = useState("");
  const [count, setCount] = useState(6);
  const [firstDate, setFirstDate] = useState<string>(addMonths(today, 1));
  const account = accounts.find((a) => a.id === accountId);
  const [chosenCurrency, setCurrency] = useState<CurrencyCode | undefined>(undefined);
  const currency =
    account && (chosenCurrency === account.currency || chosenCurrency === account.secondaryCurrency)
      ? chosenCurrency
      : (account?.currency ?? "CLP");
  const accountCards = cards.filter((c) => c.accountId === accountId);

  // Live preview using the same domain functions the server uses.
  const parsedTotal = account && total ? parseAmount(total, currency) : null;
  const preview =
    account && parsedTotal?.ok && parsedTotal.value > 0 && count >= 2 && count <= MAX_INSTALLMENTS
      ? splitEvenly(parsedTotal.value, count)
      : null;

  return (
    <ActionForm form={form} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <div className="grid gap-4 @md:grid-cols-2">
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
            placeholder="Notebook, pasajes…"
          />
        </Field>
        <Field label="Monto total" htmlFor="totalAmount" error={fieldError(state, "totalAmount")}>
          <div className="flex items-center gap-2">
            <Input
              id="totalAmount"
              name="totalAmount"
              inputMode="decimal"
              required
              value={total}
              onChange={(event) => setTotal(event.target.value)}
              placeholder="0"
            />
            <span className="text-muted w-10 text-sm">{currency}</span>
          </div>
        </Field>
        <Field
          label="Número de cuotas"
          htmlFor="installmentCount"
          error={fieldError(state, "installmentCount")}
        >
          <Input
            id="installmentCount"
            name="installmentCount"
            type="number"
            min={2}
            max={MAX_INSTALLMENTS}
            required
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
          />
        </Field>
        <Field
          label="Fecha del primer cobro"
          htmlFor="firstChargeDate"
          error={fieldError(state, "firstChargeDate")}
          hint="Las siguientes cuotas caen el mismo día de cada mes."
        >
          <Input
            id="firstChargeDate"
            name="firstChargeDate"
            type="date"
            required
            value={firstDate}
            onChange={(event) => setFirstDate(event.target.value)}
          />
        </Field>
        <Field label="Categoría" htmlFor="categoryId" error={fieldError(state, "categoryId")}>
          <CategorySelect
            id="categoryId"
            name="categoryId"
            tree={categories}
            required
            defaultValue=""
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
        </div>
        {accountCards.length > 0 ? (
          <Field label="Tarjeta" htmlFor="cardId" error={fieldError(state, "cardId")}>
            <CardSelect
              id="cardId"
              name="cardId"
              cards={accountCards}
              key={accountId}
              defaultValue=""
            />
          </Field>
        ) : null}
      </div>

      {preview && account ? (
        <p className="bg-accent-soft text-accent rounded-xs px-3 py-2 text-sm">
          {count} cuotas de {formatMoney(preview[preview.length - 1]!, currency)}
          {preview[0] !== preview[preview.length - 1]
            ? ` (la primera de ${formatMoney(preview[0]!, currency)})`
            : ""}
          {/^\d{4}-\d{2}-\d{2}$/.test(firstDate)
            ? `, desde el ${formatDate(firstDate as LocalDate)}.`
            : "."}
        </p>
      ) : null}

      <fieldset className="border-border flex flex-col gap-3 rounded-xs border p-4">
        <legend className="px-1 text-sm font-medium">Clasificación del gasto</legend>
        <ClassificationFields
          costTypeName="costType"
          necessityName="necessity"
          emptyLabel="Según la categoría"
        />
      </fieldset>

      <div className="flex gap-2">
        <SubmitButton>Registrar compra en cuotas</SubmitButton>
        <CancelButton href="/transactions" />
      </div>
    </ActionForm>
  );
}
