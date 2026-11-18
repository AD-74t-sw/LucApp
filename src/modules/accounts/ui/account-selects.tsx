import type { ComponentProps } from "react";
import type { CurrencyCode } from "@/shared/domain";
import { Select, cn } from "@/shared/ui";
import type { Account } from "../domain/account";
import type { Card } from "../domain/card";
import { ACCOUNT_TYPE_LABELS, CARD_KIND_LABELS } from "./labels";

/** Account picker grouped by account type, showing each account's currency. */
export function AccountSelect({
  accounts,
  placeholder = "Selecciona una cuenta",
  ...props
}: ComponentProps<typeof Select> & { accounts: readonly Account[]; placeholder?: string }) {
  const types = [...new Set(accounts.map((a) => a.type))];
  return (
    <Select {...props}>
      <option value="">{placeholder}</option>
      {types.map((type) => (
        <optgroup key={type} label={ACCOUNT_TYPE_LABELS[type]}>
          {accounts
            .filter((a) => a.type === type)
            .map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))}
        </optgroup>
      ))}
    </Select>
  );
}

export function CardSelect({
  cards,
  ...props
}: ComponentProps<typeof Select> & { cards: readonly Card[] }) {
  return (
    <Select {...props}>
      <option value="">Sin tarjeta</option>
      {cards.map((card) => (
        <option key={card.id} value={card.id}>
          {card.name} · {CARD_KIND_LABELS[card.kind]}
          {card.last4 ? ` ${card.last4}` : ""}
        </option>
      ))}
    </Select>
  );
}

/**
 * Currency of a movement on the selected account. Only cards with an
 * international quota offer a choice; otherwise the account currency is sent.
 */
export function AccountCurrencyField({
  account,
  name = "currency",
  value,
  onChange,
  label = "Moneda",
}: {
  account: Account | undefined;
  name?: string;
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  label?: string;
}) {
  if (!account) return null;
  if (!account.secondaryCurrency) {
    return <input type="hidden" name={name} value={account.currency} />;
  }
  const options: { currency: CurrencyCode; label: string }[] = [
    { currency: account.currency, label: `Nacional (${account.currency})` },
    { currency: account.secondaryCurrency, label: `Internacional (${account.secondaryCurrency})` },
  ];
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{label}</legend>
      <div className="border-border inline-flex w-fit border">
        {options.map((option) => (
          <label
            key={option.currency}
            className={cn(
              "cursor-pointer px-3 py-2 text-sm",
              value === option.currency
                ? "bg-primary text-primary-foreground"
                : "text-muted hover:text-foreground",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.currency}
              checked={value === option.currency}
              onChange={() => onChange(option.currency)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
