"use client";

import { useState } from "react";
import type { Account } from "@/modules/accounts";
import { AccountCurrencyField, AccountSelect } from "@/modules/accounts/ui";
import { type CurrencyCode, type LocalDate, convertAmount, parseAmount } from "@/shared/domain";
import {
  type ActionState,
  ActionForm,
  Field,
  FormAlert,
  Input,
  LOCALE,
  SubmitButton,
  cn,
  fieldError,
  formatMoney,
  useFormAction,
  CancelButton,
} from "@/shared/ui";

type Method = "paid" | "rate";

/** Parses "970,5" / "970.5" for the live preview (the server validates again). */
function parseRateInput(value: string): number | null {
  const number = Number(value.trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(number) && number > 0 ? number : null;
}

/**
 * Transfer between own accounts. Paying a credit card = transfer from the bank
 * account to the card. For the card's international debt the amounts differ in
 * currency: you enter what you paid off and either what the bank charged you or
 * the bank's rate.
 */
export function TransferForm({
  action,
  accounts,
  today,
  referenceRate,
  defaults,
  submitLabel = "Registrar transferencia",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  accounts: readonly Account[];
  today: LocalDate;
  /** Current "dólar observado", shown as a reference only. */
  referenceRate: { rate: number; date: LocalDate } | null;
  /** Starting values (for example, read from a bank notice). */
  defaults?: Partial<{
    fromAccountId: string;
    toAccountId: string;
    amount: string;
    date: LocalDate;
    description: string;
  }>;
  submitLabel?: string;
}) {
  const form = useFormAction(action);
  const { state } = form;
  const [fromId, setFromId] = useState(
    defaults?.fromAccountId ?? accounts.find((a) => a.type !== "CREDIT_CARD")?.id ?? "",
  );
  const [toId, setToId] = useState(defaults?.toAccountId ?? "");
  const [chosenToCurrency, setToCurrency] = useState<CurrencyCode | undefined>(undefined);
  const [method, setMethod] = useState<Method>("paid");
  const [received, setReceived] = useState("");
  const [sent, setSent] = useState(defaults?.amount ?? "");
  const [rate, setRate] = useState("");

  const from = accounts.find((a) => a.id === fromId);
  const to = accounts.find((a) => a.id === toId);
  const toCurrency =
    to && (chosenToCurrency === to.currency || chosenToCurrency === to.secondaryCurrency)
      ? chosenToCurrency
      : (to?.currency ?? from?.currency ?? "CLP");
  const fromCurrency = from?.currency ?? "CLP";
  const crossCurrency = from !== undefined && to !== undefined && fromCurrency !== toCurrency;

  // Live previews: pesos from the bank rate, or the effective rate from what was paid.
  // Major units (pesos, dollars) to express the rate as pesos per dollar.
  const major = (currency: CurrencyCode, minor: number) =>
    currency === "USD" ? minor / 100 : minor;
  const receivedMinor = received ? parseAmount(received, toCurrency) : null;
  const sentMinor = sent ? parseAmount(sent, fromCurrency) : null;
  const bankRate = parseRateInput(rate);
  const preview =
    crossCurrency && method === "rate" && receivedMinor?.ok && bankRate
      ? convertAmount(
          receivedMinor.value,
          toCurrency,
          fromCurrency,
          toCurrency === "USD" ? bankRate : 1 / bankRate,
        )
      : null;
  const effectiveRate =
    crossCurrency &&
    method === "paid" &&
    receivedMinor?.ok &&
    sentMinor?.ok &&
    receivedMinor.value > 0
      ? toCurrency === "USD"
        ? major(fromCurrency, sentMinor.value) / major(toCurrency, receivedMinor.value)
        : major(toCurrency, receivedMinor.value) / major(fromCurrency, sentMinor.value)
      : null;
  const number = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });

  return (
    <ActionForm form={form} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <div className="grid gap-4 @md:grid-cols-2">
        <Field label="Desde" htmlFor="fromAccountId" error={fieldError(state, "fromAccountId")}>
          <AccountSelect
            id="fromAccountId"
            name="fromAccountId"
            accounts={accounts}
            required
            value={fromId}
            onChange={(event) => setFromId(event.target.value)}
          />
        </Field>
        <Field
          label="Hacia"
          htmlFor="toAccountId"
          error={fieldError(state, "toAccountId")}
          hint="Para pagar una tarjeta de crédito, elige la tarjeta como destino."
        >
          <AccountSelect
            id="toAccountId"
            name="toAccountId"
            accounts={accounts.filter((a) => a.id !== fromId)}
            required
            value={toId}
            onChange={(event) => setToId(event.target.value)}
          />
        </Field>
        <div className="@md:col-span-2">
          <AccountCurrencyField
            account={to}
            name="toCurrency"
            label="¿Qué deuda pagas?"
            value={toCurrency}
            onChange={setToCurrency}
          />
          {fieldError(state, "toCurrency") ? (
            <p className="text-danger mt-1 text-xs">{fieldError(state, "toCurrency")}</p>
          ) : null}
        </div>

        {crossCurrency ? (
          <>
            <Field
              label={`Monto abonado (${toCurrency})`}
              htmlFor="toAmount"
              error={fieldError(state, "toAmount")}
              hint={`Cuánto baja la deuda en ${toCurrency}.`}
            >
              <Input
                id="toAmount"
                name="toAmount"
                inputMode="decimal"
                required
                placeholder="0"
                value={received}
                onChange={(event) => setReceived(event.target.value)}
              />
            </Field>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-medium">¿Cómo lo pagaste?</legend>
              <div className="border-border inline-flex w-fit border">
                {(
                  [
                    ["paid", `Monto en ${fromCurrency}`],
                    ["rate", "Tipo de cambio"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={cn(
                      "cursor-pointer px-3 py-2 text-sm",
                      method === value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted hover:text-foreground",
                    )}
                  >
                    <input
                      type="radio"
                      name="method"
                      value={value}
                      checked={method === value}
                      onChange={() => setMethod(value)}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            {method === "paid" ? (
              <Field
                label={`Monto pagado (${fromCurrency})`}
                htmlFor="amount"
                error={fieldError(state, "amount")}
                hint={
                  effectiveRate
                    ? `Equivale a $${number.format(effectiveRate)} por dólar.`
                    : "Lo que te cobró el banco en la cuenta de origen."
                }
              >
                <Input
                  id="amount"
                  name="amount"
                  inputMode="decimal"
                  required
                  placeholder="0"
                  value={sent}
                  onChange={(event) => setSent(event.target.value)}
                />
              </Field>
            ) : (
              <Field
                label="Tipo de cambio del banco ($ por USD)"
                htmlFor="rate"
                error={fieldError(state, "rate") ?? fieldError(state, "amount")}
                hint={
                  preview !== null
                    ? `Se descontarán ${formatMoney(preview, fromCurrency)} de ${from?.name}.`
                    : referenceRate
                      ? `Dólar observado hoy: $${number.format(referenceRate.rate)}.`
                      : undefined
                }
              >
                <Input
                  id="rate"
                  name="rate"
                  inputMode="decimal"
                  required
                  placeholder={referenceRate ? number.format(referenceRate.rate) : "950"}
                  value={rate}
                  onChange={(event) => setRate(event.target.value)}
                />
              </Field>
            )}
          </>
        ) : (
          <Field
            label={`Monto${from ? ` (${fromCurrency})` : ""}`}
            htmlFor="amount"
            error={fieldError(state, "amount")}
          >
            <Input
              id="amount"
              name="amount"
              inputMode="decimal"
              required
              placeholder="0"
              defaultValue={defaults?.amount}
            />
          </Field>
        )}

        <Field label="Fecha" htmlFor="date" error={fieldError(state, "date")}>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={defaults?.date ?? today}
          />
        </Field>
        <Field
          label="Descripción (opcional)"
          htmlFor="description"
          error={fieldError(state, "description")}
        >
          <Input
            id="description"
            name="description"
            maxLength={120}
            defaultValue={defaults?.description}
            placeholder="Pago tarjeta, ahorro…"
          />
        </Field>
      </div>
      <div className="flex gap-2">
        <SubmitButton>{submitLabel}</SubmitButton>
        <CancelButton href="/transactions" />
      </div>
    </ActionForm>
  );
}
