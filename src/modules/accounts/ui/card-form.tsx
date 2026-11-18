"use client";

import { useEffect, useRef } from "react";
import {
  type ActionState,
  Field,
  FormAlert,
  ActionForm,
  useFormAction,
  Input,
  SubmitButton,
  fieldError,
  CancelButton,
} from "@/shared/ui";
import { CARD_NETWORKS } from "../domain/card";
import { CardNetworkLogo } from "./card-network-logo";
import { CARD_NETWORK_LABELS } from "./labels";

/** Adds a card to a fixed account (the account id travels as a hidden field). */
export function CardForm({
  action,
  accountId,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  accountId: string;
}) {
  const form = useFormAction(action);
  const { state } = form;
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <ActionForm ref={formRef} form={form} className="flex flex-col gap-3">
      <input type="hidden" name="accountId" value={accountId} />
      <FormAlert state={state} />
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Red</legend>
        <div className="flex flex-wrap gap-2">
          {CARD_NETWORKS.map((network) => (
            <label
              key={network}
              className="border-border has-checked:border-border-strong has-checked:bg-surface-muted has-focus-visible:ring-ring flex cursor-pointer items-center gap-2 border px-3 py-2 text-sm has-focus-visible:ring-2"
            >
              <input
                type="radio"
                name="network"
                value={network}
                defaultChecked={network === "VISA"}
                className="sr-only"
              />
              <CardNetworkLogo network={network} height={20} />
              {CARD_NETWORK_LABELS[network]}
            </label>
          ))}
        </div>
        {fieldError(state, "network") ? (
          <p className="text-negative text-xs">{fieldError(state, "network")}</p>
        ) : null}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <Field label="Nombre" htmlFor="card-name" error={fieldError(state, "name")}>
          <Input
            id="card-name"
            name="name"
            placeholder="Titular, adicional…"
            required
            maxLength={60}
          />
        </Field>
        <Field label="Últimos 4" htmlFor="card-last4" error={fieldError(state, "last4")}>
          <Input
            id="card-last4"
            name="last4"
            inputMode="numeric"
            maxLength={4}
            placeholder="1234"
          />
        </Field>
      </div>
      <div className="flex gap-2">
        <SubmitButton>Agregar tarjeta</SubmitButton>
        <CancelButton />
      </div>
    </ActionForm>
  );
}
