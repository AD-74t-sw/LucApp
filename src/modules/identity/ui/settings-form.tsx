"use client";

import { CURRENCIES, CURRENCY_CODES } from "@/shared/domain";
import {
  Field,
  FormAlert,
  ActionForm,
  Input,
  Select,
  SubmitButton,
  fieldError,
  useFormAction,
} from "@/shared/ui";
import type { CurrentUser } from "../domain/user";
import { saveSettingsAction } from "./actions";

const TIME_ZONES = [
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  "America/Lima",
  "America/Mexico_City",
  "America/Montevideo",
  "America/Sao_Paulo",
  "America/New_York",
  "Europe/Madrid",
  "UTC",
];

export function SettingsForm({ user }: { user: CurrentUser }) {
  const form = useFormAction(saveSettingsAction);
  const { state } = form;
  const zones = TIME_ZONES.includes(user.timezone) ? TIME_ZONES : [user.timezone, ...TIME_ZONES];
  return (
    <ActionForm form={form} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="name" error={fieldError(state, "name")}>
          <Input id="name" name="name" defaultValue={user.name} required maxLength={80} />
        </Field>
        <Field label="Correo" htmlFor="email" hint="Gestionado por Supabase Auth.">
          <Input id="email" value={user.email} disabled readOnly />
        </Field>
        <Field
          label="Moneda principal"
          htmlFor="baseCurrency"
          error={fieldError(state, "baseCurrency")}
          hint="Las métricas se convierten a esta moneda."
        >
          <Select id="baseCurrency" name="baseCurrency" defaultValue={user.baseCurrency}>
            {CURRENCY_CODES.map((code) => (
              <option key={code} value={code}>
                {code} · {CURRENCIES[code].name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Zona horaria"
          htmlFor="timezone"
          error={fieldError(state, "timezone")}
          hint="Define qué día es hoy y dónde empieza cada mes."
        >
          <Select id="timezone" name="timezone" defaultValue={user.timezone}>
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div>
        <SubmitButton>Guardar preferencias</SubmitButton>
      </div>
    </ActionForm>
  );
}
