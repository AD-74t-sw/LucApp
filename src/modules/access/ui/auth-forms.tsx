"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
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
import { loginAction, registerAction } from "./actions";

export function LoginForm() {
  const form = useFormAction(loginAction);
  const { state } = form;
  return (
    <ActionForm form={form} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <Field label="Correo" htmlFor="email" error={fieldError(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Contraseña" htmlFor="password" error={fieldError(state, "password")}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <SubmitButton pendingLabel="Ingresando…">Ingresar</SubmitButton>
      <p className="text-muted text-center text-sm">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="text-accent font-medium hover:underline">
          Regístrate
        </Link>
      </p>
    </ActionForm>
  );
}

const subscribeNoop = () => () => {};

/** Browser time zone, so "today" and month boundaries match where the person lives. */
function useBrowserTimeZone(): string {
  return useSyncExternalStore(
    subscribeNoop,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => "America/Santiago",
  );
}

export function RegisterForm() {
  const form = useFormAction(registerAction);
  const { state } = form;
  const timeZone = useBrowserTimeZone();

  if (state.status === "success") {
    return <FormAlert state={state} />;
  }

  return (
    <ActionForm form={form} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <input type="hidden" name="timezone" value={timeZone} />
      <Field label="Nombre" htmlFor="name" error={fieldError(state, "name")}>
        <Input id="name" name="name" autoComplete="name" required maxLength={80} />
      </Field>
      <Field label="Correo" htmlFor="email" error={fieldError(state, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field
        label="Contraseña"
        htmlFor="password"
        error={fieldError(state, "password")}
        hint="Mínimo 8 caracteres."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      <Field
        label="Moneda principal"
        htmlFor="baseCurrency"
        error={fieldError(state, "baseCurrency")}
        hint="Las métricas se muestran en esta moneda. Puedes cambiarla después."
      >
        <Select id="baseCurrency" name="baseCurrency" defaultValue="CLP">
          {CURRENCY_CODES.map((code) => (
            <option key={code} value={code}>
              {code} · {CURRENCIES[code].name}
            </option>
          ))}
        </Select>
      </Field>
      <SubmitButton pendingLabel="Creando cuenta…">Crear cuenta</SubmitButton>
      <p className="text-muted text-center text-sm">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-accent font-medium hover:underline">
          Inicia sesión
        </Link>
      </p>
    </ActionForm>
  );
}
