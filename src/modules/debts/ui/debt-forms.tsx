"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Account } from "@/modules/accounts";
import { AccountSelect } from "@/modules/accounts/ui";
import type { CategoryNode } from "@/modules/categories";
import { CategorySelect, ClassificationFields } from "@/modules/categories/ui";
import {
  CURRENCY_CODES,
  type CurrencyCode,
  type LocalDate,
  toDecimalString,
} from "@/shared/domain";
import {
  type ActionState,
  ActionForm,
  Field,
  FormAlert,
  Input,
  Select,
  SubmitButton,
  Textarea,
  fieldError,
  useFormAction,
  CancelButton,
} from "@/shared/ui";
import type { DebtPayment, Person } from "../domain/debt";
import type { DebtListItem } from "../infrastructure/debt-repository";
import { createDebtAction, createPersonAction } from "./actions";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/** Clears the form after a successful submission so the next entry starts empty. */
function useResetOnSuccess(state: ActionState, enabled = true) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (enabled && state.status === "success") ref.current?.reset();
  }, [state, enabled]);
  return ref;
}

export function PersonForm({
  action = createPersonAction,
  person,
}: {
  action?: FormAction;
  person?: Person;
}) {
  const form = useFormAction(action);
  const { state } = form;
  return (
    <ActionForm form={form} className="flex flex-col gap-3">
      <FormAlert state={state} />
      <Field label="Nombre" htmlFor="person-name" error={fieldError(state, "name")}>
        <Input id="person-name" name="name" required maxLength={80} defaultValue={person?.name} />
      </Field>
      <Field label="Nota (opcional)" htmlFor="person-note" error={fieldError(state, "note")}>
        <Textarea
          id="person-note"
          name="note"
          maxLength={300}
          defaultValue={person?.note ?? undefined}
        />
      </Field>
      <div className="flex gap-2">
        <SubmitButton>{person ? "Guardar" : "Agregar persona"}</SubmitButton>
        <CancelButton />
      </div>
    </ActionForm>
  );
}

type DebtFormProps = {
  people: readonly Person[];
  accounts: readonly Account[];
  /** Expense categories (debts are classified like expenses). */
  categories: readonly CategoryNode[];
  baseCurrency: CurrencyCode;
  today: LocalDate;
} & (
  | {
      /** Creating from a person's page: the person is fixed. */
      personId?: string;
      debt?: undefined;
      action?: undefined;
    }
  | {
      /** Editing: all editable fields start with the debt's values. */
      debt: DebtListItem;
      action: FormAction;
      personId?: undefined;
    }
);

/** Creates or edits a debt. Currency and account cannot change after creation. */
export function DebtForm(props: DebtFormProps) {
  const { people, accounts, categories, baseCurrency, today, debt } = props;
  const editing = debt !== undefined;
  const form = useFormAction(props.action ?? createDebtAction);
  const { state } = form;
  const formRef = useResetOnSuccess(state, !editing);
  const fixedPerson = editing ? undefined : props.personId;

  return (
    <ActionForm ref={formRef} form={form} className="flex flex-col gap-4">
      <FormAlert state={state} />
      {fixedPerson ? <input type="hidden" name="personId" value={fixedPerson} /> : null}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">¿Quién le debe a quién?</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="direction"
            value="THEY_OWE"
            defaultChecked={(debt?.direction ?? "THEY_OWE") === "THEY_OWE"}
            className="accent-accent"
          />
          Me deben (presté dinero o pagué por otra persona)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="direction"
            value="I_OWE"
            defaultChecked={debt?.direction === "I_OWE"}
            className="accent-accent"
          />
          Debo (me prestaron o pagaron por mí)
        </label>
        <p className="text-muted text-xs">
          La deuda no es un gasto: aparece en tu resumen como pendiente. Cada abono que hagas a lo
          que debes se suma a tus gastos en esta categoría. Lo que te deben se muestra como
          &quot;por cobrar&quot;.
        </p>
      </fieldset>
      <div className="grid gap-4 @md:grid-cols-2">
        {fixedPerson ? null : (
          <Field label="Persona" htmlFor="personId" error={fieldError(state, "personId")}>
            <Select id="personId" name="personId" required defaultValue={debt?.personId ?? ""}>
              <option value="">Selecciona una persona</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field
          label="Descripción"
          htmlFor="debt-description"
          error={fieldError(state, "description")}
        >
          <Input
            id="debt-description"
            name="description"
            required
            maxLength={120}
            defaultValue={debt?.description}
            placeholder="Cena, préstamo…"
          />
        </Field>
        <Field
          label="Categoría"
          htmlFor="debt-category"
          error={fieldError(state, "categoryId")}
          hint={
            categories.length === 0 ? (
              <>
                No tienes categorías de gasto.{" "}
                <Link href="/categories" className="text-accent underline">
                  Créalas en Categorías
                </Link>
                .
              </>
            ) : undefined
          }
        >
          <CategorySelect
            id="debt-category"
            name="categoryId"
            tree={categories}
            required
            defaultValue={debt?.categoryId ?? ""}
          />
        </Field>
        <Field label="Monto" htmlFor="debt-amount" error={fieldError(state, "amount")}>
          <div className="flex items-center gap-2">
            <Input
              id="debt-amount"
              name="amount"
              inputMode="decimal"
              required
              placeholder="0"
              defaultValue={debt ? toDecimalString(debt.principal, debt.currency) : undefined}
            />
            {debt ? <span className="text-muted w-10 text-sm">{debt.currency}</span> : null}
          </div>
        </Field>
        {editing ? null : (
          <Field label="Moneda" htmlFor="debt-currency" error={fieldError(state, "currency")}>
            <Select id="debt-currency" name="currency" defaultValue={baseCurrency}>
              {CURRENCY_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Fecha" htmlFor="debt-date" error={fieldError(state, "date")}>
          <Input
            id="debt-date"
            name="date"
            type="date"
            required
            defaultValue={debt?.date ?? today}
          />
        </Field>
        <Field label="Vence (opcional)" htmlFor="debt-due" error={fieldError(state, "dueDate")}>
          <Input
            id="debt-due"
            name="dueDate"
            type="date"
            defaultValue={debt?.dueDate ?? undefined}
          />
        </Field>
        {editing ? null : (
          <Field
            label="Registrar en cuenta (opcional)"
            htmlFor="debt-account"
            error={fieldError(state, "accountId")}
            hint="Si el dinero salió o entró de una cuenta, se registra el movimiento. Si te prestaron efectivo a una cuenta, sus abonos no suman como gasto: lo que compres con ese dinero ya es un gasto."
            className="@md:col-span-2"
          >
            <AccountSelect
              id="debt-account"
              name="accountId"
              accounts={accounts}
              placeholder="No registrar"
            />
          </Field>
        )}
      </div>

      <fieldset className="border-border flex flex-col gap-3 rounded-xs border p-4">
        <legend className="px-1 text-sm font-medium">Clasificación</legend>
        <ClassificationFields
          costTypeName="costType"
          necessityName="necessity"
          defaultCostType={debt?.costType}
          defaultNecessity={debt?.necessity}
          emptyLabel="Según la categoría"
          errors={{
            costType: fieldError(state, "costType"),
            necessity: fieldError(state, "necessity"),
          }}
        />
      </fieldset>

      {debt?.transactionId ? (
        <p className="text-muted text-xs">
          Esta deuda está registrada en una cuenta: al guardar se ajustan ese movimiento y los de
          sus abonos.
        </p>
      ) : null}

      <div className="flex gap-2">
        <SubmitButton>{editing ? "Guardar cambios" : "Registrar deuda"}</SubmitButton>
        <CancelButton href={editing ? `/debts/${debt.personId}` : "/debts"} />
      </div>
    </ActionForm>
  );
}

/** Registers a payment, or edits one when `payment` is given (its account cannot change). */
export function PaymentForm({
  action,
  idPrefix,
  accounts,
  today,
  currency,
  payment,
}: {
  action: FormAction;
  /** Keeps element ids unique when several payment forms share a page. */
  idPrefix: string;
  accounts: readonly Account[];
  today: LocalDate;
  currency: CurrencyCode;
  payment?: DebtPayment;
}) {
  const form = useFormAction(action);
  const { state } = form;
  const formRef = useResetOnSuccess(state, payment === undefined);
  return (
    <ActionForm ref={formRef} form={form} className="flex flex-col gap-3">
      <FormAlert state={state} />
      <div className="grid gap-3 @md:grid-cols-2">
        <Field
          label="Monto del abono"
          htmlFor={`${idPrefix}-amount`}
          error={fieldError(state, "amount")}
        >
          <Input
            id={`${idPrefix}-amount`}
            name="amount"
            inputMode="decimal"
            required
            placeholder="0"
            defaultValue={payment ? toDecimalString(payment.amount, currency) : undefined}
          />
        </Field>
        <Field label="Fecha" htmlFor={`${idPrefix}-date`} error={fieldError(state, "date")}>
          <Input
            id={`${idPrefix}-date`}
            name="date"
            type="date"
            required
            defaultValue={payment?.date ?? today}
          />
        </Field>
        {payment ? null : (
          <Field
            label="Cuenta (opcional)"
            htmlFor={`${idPrefix}-account`}
            error={fieldError(state, "accountId")}
          >
            <AccountSelect
              id={`${idPrefix}-account`}
              name="accountId"
              accounts={accounts}
              placeholder="No registrar"
            />
          </Field>
        )}
        <Field
          label="Nota (opcional)"
          htmlFor={`${idPrefix}-note`}
          error={fieldError(state, "note")}
        >
          <Input
            id={`${idPrefix}-note`}
            name="note"
            maxLength={200}
            defaultValue={payment?.note ?? undefined}
          />
        </Field>
      </div>
      <div className="flex gap-2">
        <SubmitButton>{payment ? "Guardar abono" : "Registrar abono"}</SubmitButton>
        <CancelButton />
      </div>
    </ActionForm>
  );
}
