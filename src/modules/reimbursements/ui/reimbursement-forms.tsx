"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Account } from "@/modules/accounts";
import { AccountSelect } from "@/modules/accounts/ui";
import type { CategoryNode } from "@/modules/categories";
import { CategorySelect } from "@/modules/categories/ui";
import {
  CURRENCY_CODES,
  type CurrencyCode,
  type LocalDate,
  toDecimalString,
} from "@/shared/domain";
import {
  type ActionState,
  ActionForm,
  CancelButton,
  Field,
  FormAlert,
  Input,
  Select,
  SubmitButton,
  Textarea,
  fieldError,
  useFormAction,
} from "@/shared/ui";
import { providerSuggestions } from "../domain/providers";
import {
  REIMBURSEMENT_KINDS,
  type Reimbursement,
  type ReimbursementKind,
} from "../domain/reimbursement";
import { createReimbursementAction } from "./actions";
import { KIND_LABELS } from "./labels";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

const decimal = (minor: number | null, currency: CurrencyCode) =>
  minor === null ? undefined : toDecimalString(minor, currency);

/** New claim (amount still unknown), or editing what it is about. */
export function ClaimForm({
  action,
  claim,
  baseCurrency,
  today,
}: {
  action?: FormAction;
  /** Editing: currency and progress stay as they are. */
  claim?: Reimbursement;
  baseCurrency: CurrencyCode;
  today: LocalDate;
}) {
  const id = useId();
  const form = useFormAction(action ?? createReimbursementAction);
  const { state } = form;
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<ReimbursementKind>(claim?.kind ?? "HEALTH_PLAN");
  useEffect(() => {
    if (!claim && state.status === "success") formRef.current?.reset();
  }, [state, claim]);

  return (
    <ActionForm ref={formRef} form={form} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <div className="grid gap-4 @md:grid-cols-2">
        <Field label="Tipo" htmlFor={`${id}-kind`} error={fieldError(state, "kind")}>
          <Select
            id={`${id}-kind`}
            name="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as ReimbursementKind)}
          >
            {REIMBURSEMENT_KINDS.map((value) => (
              <option key={value} value={value}>
                {KIND_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="¿Quién devuelve?"
          htmlFor={`${id}-provider`}
          error={fieldError(state, "provider")}
        >
          <Input
            id={`${id}-provider`}
            name="provider"
            required
            maxLength={80}
            list={`${id}-providers`}
            defaultValue={claim?.provider}
            placeholder="Isapre, aseguradora, tienda…"
            autoComplete="off"
          />
          <datalist id={`${id}-providers`}>
            {providerSuggestions(kind).map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </Field>
        <Field
          label="Descripción"
          htmlFor={`${id}-description`}
          error={fieldError(state, "description")}
          className="@md:col-span-2"
        >
          <Input
            id={`${id}-description`}
            name="description"
            required
            maxLength={120}
            defaultValue={claim?.description}
            placeholder="Consulta traumatólogo, lentes, exámenes…"
          />
        </Field>
        <Field
          label="Fecha de solicitud"
          htmlFor={`${id}-requested`}
          error={fieldError(state, "requestedOn")}
        >
          <Input
            id={`${id}-requested`}
            name="requestedOn"
            type="date"
            required
            defaultValue={claim?.requestedOn ?? today}
          />
        </Field>
        <Field
          label="Monto aproximado (opcional)"
          htmlFor={`${id}-estimate`}
          error={fieldError(state, "estimatedAmount")}
          hint="Si aún no sabes cuánto te devolverán, déjalo vacío."
        >
          <div className="flex items-center gap-2">
            <Input
              id={`${id}-estimate`}
              name="estimatedAmount"
              inputMode="decimal"
              placeholder="0"
              defaultValue={claim ? decimal(claim.estimatedAmount, claim.currency) : undefined}
            />
            {claim ? null : (
              <Select
                name="currency"
                aria-label="Moneda"
                defaultValue={baseCurrency}
                className="w-24"
              >
                {CURRENCY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </Select>
            )}
            {claim ? <span className="text-muted w-10 text-sm">{claim.currency}</span> : null}
          </div>
        </Field>
        <Field
          label="Nota (opcional)"
          htmlFor={`${id}-note`}
          error={fieldError(state, "note")}
          className="@md:col-span-2"
        >
          <Textarea
            id={`${id}-note`}
            name="note"
            maxLength={300}
            defaultValue={claim?.note ?? undefined}
            placeholder="N° de solicitud, documentos enviados…"
          />
        </Field>
      </div>
      <div className="flex gap-2">
        <SubmitButton>{claim ? "Guardar cambios" : "Agregar devolución"}</SubmitButton>
        <CancelButton />
      </div>
    </ActionForm>
  );
}

/** The payer confirmed how much and when: amount plus the payment window. */
export function ApprovalForm({ action, claim }: { action: FormAction; claim: Reimbursement }) {
  const id = useId();
  const form = useFormAction(action);
  const { state } = form;
  return (
    <ActionForm form={form} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <Field
        label={`Monto a devolver (${claim.currency})`}
        htmlFor={`${id}-amount`}
        error={fieldError(state, "amount")}
      >
        <Input
          id={`${id}-amount`}
          name="amount"
          inputMode="decimal"
          required
          placeholder="0"
          defaultValue={decimal(claim.amount ?? claim.estimatedAmount, claim.currency)}
        />
      </Field>
      <fieldset className="grid gap-4 @md:grid-cols-2">
        <legend className="mb-2 text-sm font-medium">¿Cuándo debería llegar?</legend>
        <Field label="Desde" htmlFor={`${id}-from`} error={fieldError(state, "expectedFrom")}>
          <Input
            id={`${id}-from`}
            name="expectedFrom"
            type="date"
            required
            defaultValue={claim.expectedFrom ?? undefined}
          />
        </Field>
        <Field label="Hasta" htmlFor={`${id}-to`} error={fieldError(state, "expectedTo")}>
          <Input
            id={`${id}-to`}
            name="expectedTo"
            type="date"
            required
            defaultValue={claim.expectedTo ?? undefined}
          />
        </Field>
      </fieldset>
      <div className="flex gap-2">
        <SubmitButton>Guardar monto y fechas</SubmitButton>
        <CancelButton />
      </div>
    </ActionForm>
  );
}

/**
 * The money arrived. Choosing an account records it there as income, so the
 * balance matches the bank.
 */
export function ReceiptForm({
  action,
  claim,
  accounts,
  incomeCategories,
  defaultCategoryId,
  today,
}: {
  action: FormAction;
  claim: Reimbursement;
  /** Accounts that can hold the claim's currency. */
  accounts: readonly Account[];
  incomeCategories: readonly CategoryNode[];
  /** Usually the "Reembolsos" income category. */
  defaultCategoryId?: string;
  today: LocalDate;
}) {
  const id = useId();
  const form = useFormAction(action);
  const { state } = form;
  const [accountId, setAccountId] = useState("");
  const expected = claim.amount ?? claim.estimatedAmount;
  return (
    <ActionForm form={form} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <div className="grid gap-4 @md:grid-cols-2">
        <Field
          label={`Monto recibido (${claim.currency})`}
          htmlFor={`${id}-amount`}
          error={fieldError(state, "amount")}
        >
          <Input
            id={`${id}-amount`}
            name="amount"
            inputMode="decimal"
            required
            placeholder="0"
            defaultValue={decimal(expected, claim.currency)}
          />
        </Field>
        <Field label="Fecha" htmlFor={`${id}-date`} error={fieldError(state, "date")}>
          <Input id={`${id}-date`} name="date" type="date" required defaultValue={today} />
        </Field>
        <Field
          label="¿A qué cuenta llegó? (opcional)"
          htmlFor={`${id}-account`}
          error={fieldError(state, "accountId")}
          hint="Se registra como ingreso en esa cuenta."
        >
          <AccountSelect
            id={`${id}-account`}
            name="accountId"
            accounts={accounts}
            placeholder="No registrar"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
          />
        </Field>
        {accountId ? (
          <Field
            label="Categoría del ingreso"
            htmlFor={`${id}-category`}
            error={fieldError(state, "categoryId")}
          >
            <CategorySelect
              id={`${id}-category`}
              name="categoryId"
              tree={incomeCategories}
              required
              defaultValue={defaultCategoryId ?? ""}
            />
          </Field>
        ) : null}
      </div>
      <div className="flex gap-2">
        <SubmitButton>Marcar como devuelta</SubmitButton>
        <CancelButton />
      </div>
    </ActionForm>
  );
}
