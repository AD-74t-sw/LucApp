"use client";

import { useState } from "react";
import {
  CURRENCIES,
  CURRENCY_CODES,
  type CurrencyCode,
  otherCurrency,
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
  fieldError,
  useFormAction,
  CancelButton,
} from "@/shared/ui";
import {
  ACCOUNT_TYPES,
  type Account,
  type AccountType,
  isCreditAccount,
  openingBalanceForInput,
} from "../domain/account";
import { InstitutionPicker } from "./institution-picker";
import { ACCOUNT_TYPE_LABELS } from "./labels";

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  account?: Account;
  defaultCurrency: CurrencyCode;
};

/** National currency of new credit cards; the international quota is the other one. */
const CARD_NATIONAL_CURRENCY: CurrencyCode = "CLP";

export function AccountForm({ action, account, defaultCurrency }: Props) {
  const form = useFormAction(action);
  const { state } = form;
  const [type, setType] = useState<AccountType>(account?.type ?? "CHECKING");
  const [chosenCurrency, setCurrency] = useState<CurrencyCode>(
    account?.currency ?? defaultCurrency,
  );
  const credit = isCreditAccount(type);
  // A credit card holds both currencies: pesos (national) and dollars (international).
  const currency = credit && !account ? CARD_NATIONAL_CURRENCY : chosenCurrency;
  const foreign = account?.secondaryCurrency ?? otherCurrency(currency);
  const [foreignLimit, setForeignLimit] = useState(
    account?.secondaryCreditLimit != null
      ? toDecimalString(account.secondaryCreditLimit, foreign)
      : "",
  );
  const hasInternational = account?.secondaryCurrency != null || foreignLimit.trim() !== "";
  const amount = (minor: number | null | undefined, inCurrency: CurrencyCode) =>
    minor === null || minor === undefined ? undefined : toDecimalString(minor, inCurrency);

  return (
    <ActionForm form={form} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <div className="grid gap-4 @md:grid-cols-2">
        <Field label="Tipo de cuenta" htmlFor="type" error={fieldError(state, "type")}>
          <Select
            id="type"
            name="type"
            value={type}
            disabled={account !== undefined}
            onChange={(event) => setType(event.target.value as AccountType)}
          >
            {ACCOUNT_TYPES.map((value) => (
              <option key={value} value={value}>
                {ACCOUNT_TYPE_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>
        {credit ? (
          // Cards always have a peso line and optionally a dollar line (see below).
          <input type="hidden" name="currency" value={currency} />
        ) : (
          <Field
            label="Moneda"
            htmlFor="currency"
            error={fieldError(state, "currency")}
            hint={account ? "La moneda no se puede cambiar." : undefined}
          >
            <Select
              id="currency"
              name="currency"
              value={currency}
              disabled={account !== undefined}
              onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
            >
              {CURRENCY_CODES.map((code) => (
                <option key={code} value={code}>
                  {code} · {CURRENCIES[code].name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Nombre" htmlFor="name" error={fieldError(state, "name")}>
          <Input
            id="name"
            name="name"
            defaultValue={account?.name}
            placeholder={credit ? "Visa Banco X" : "Cuenta corriente Banco X"}
            required
            maxLength={60}
          />
        </Field>
        <Field
          label="Institución"
          htmlFor="institution"
          error={fieldError(state, "institution")}
          hint="Elige de la lista o escribe otra."
        >
          <InstitutionPicker
            id="institution"
            name="institution"
            defaultValue={account?.institution}
            invalid={fieldError(state, "institution") !== undefined}
          />
        </Field>
        {credit ? null : (
          <Field
            label="Saldo inicial"
            htmlFor="openingBalance"
            error={fieldError(state, "openingBalance")}
            hint="Saldo antes del primer movimiento que registres."
          >
            <Input
              id="openingBalance"
              name="openingBalance"
              inputMode="decimal"
              defaultValue={account ? amount(openingBalanceForInput(account), currency) : undefined}
              placeholder="0"
            />
          </Field>
        )}
      </div>

      {credit ? (
        <>
          <div className="grid gap-4 @lg:grid-cols-2">
            <fieldset className="border-border flex flex-col gap-4 border p-4">
              <legend className="px-1 text-sm font-medium">Cupo nacional · {currency}</legend>
              <Field
                label={`Cupo (${currency})`}
                htmlFor="creditLimit"
                error={fieldError(state, "creditLimit")}
              >
                <Input
                  id="creditLimit"
                  name="creditLimit"
                  inputMode="decimal"
                  placeholder="1.000.000"
                  defaultValue={amount(account?.creditLimit, currency)}
                  required
                />
              </Field>
              <Field
                label={`Deuda actual (${currency})`}
                htmlFor="openingBalance"
                error={fieldError(state, "openingBalance")}
                hint="Lo que debes hoy, antes de registrar movimientos."
              >
                <Input
                  id="openingBalance"
                  name="openingBalance"
                  inputMode="decimal"
                  placeholder="0"
                  defaultValue={
                    account ? amount(openingBalanceForInput(account), currency) : undefined
                  }
                />
              </Field>
            </fieldset>

            <fieldset className="border-border flex flex-col gap-4 border p-4">
              <legend className="px-1 text-sm font-medium">Cupo internacional · {foreign}</legend>
              {hasInternational ? <input type="hidden" name="international" value="on" /> : null}
              <Field
                label={`Cupo (${foreign})`}
                htmlFor="secondaryCreditLimit"
                error={
                  fieldError(state, "secondaryCreditLimit") ?? fieldError(state, "international")
                }
                hint={
                  account?.secondaryCurrency
                    ? undefined
                    : `Déjalo vacío si la tarjeta no opera en ${foreign}.`
                }
              >
                <Input
                  id="secondaryCreditLimit"
                  name="secondaryCreditLimit"
                  inputMode="decimal"
                  placeholder="2.000"
                  value={foreignLimit}
                  onChange={(event) => setForeignLimit(event.target.value)}
                  required={account?.secondaryCurrency != null}
                />
              </Field>
              <Field
                label={`Deuda actual (${foreign})`}
                htmlFor="secondaryOpeningBalance"
                error={fieldError(state, "secondaryOpeningBalance")}
                hint="Mientras no la pagues, se convierte con el dólar observado del día."
              >
                <Input
                  id="secondaryOpeningBalance"
                  name="secondaryOpeningBalance"
                  inputMode="decimal"
                  placeholder="0"
                  disabled={!hasInternational}
                  defaultValue={
                    account?.secondaryCurrency
                      ? amount(Math.abs(account.secondaryOpeningBalance), foreign)
                      : undefined
                  }
                />
              </Field>
            </fieldset>
          </div>

          <div className="grid gap-4 @md:grid-cols-2">
            <Field
              label="Día de facturación"
              htmlFor="closingDay"
              error={fieldError(state, "closingDay")}
            >
              <Input
                id="closingDay"
                name="closingDay"
                type="number"
                min={1}
                max={31}
                defaultValue={account?.closingDay ?? undefined}
              />
            </Field>
            <Field label="Día de pago" htmlFor="dueDay" error={fieldError(state, "dueDay")}>
              <Input
                id="dueDay"
                name="dueDay"
                type="number"
                min={1}
                max={31}
                defaultValue={account?.dueDay ?? undefined}
              />
            </Field>
          </div>
        </>
      ) : null}

      <div className="flex gap-2">
        <SubmitButton>{account ? "Guardar cambios" : "Crear cuenta"}</SubmitButton>
        <CancelButton href={account ? `/accounts/${account.id}` : "/accounts"} />
      </div>
    </ActionForm>
  );
}
