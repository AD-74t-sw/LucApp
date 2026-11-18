"use client";

import {
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
import { pasteNoticeAction } from "./actions";

/** Adds a notice by hand: for a movement no Shortcut sent, or to check how a text is read. */
export function PasteNoticeForm() {
  const form = useFormAction(pasteNoticeAction);
  const { state } = form;
  return (
    <ActionForm form={form} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <Field label="Texto del aviso" htmlFor="notice-text" error={fieldError(state, "text")}>
        <Textarea
          id="notice-text"
          name="text"
          required
          rows={5}
          placeholder="Compra por $12.345 con Tarjeta de Crédito ****1234 en LIDER EXPRESS el 14/11/2026 12:34"
        />
      </Field>
      <div className="grid gap-4 @md:grid-cols-2">
        <Field label="Llegó por" htmlFor="notice-channel" error={fieldError(state, "channel")}>
          <Select id="notice-channel" name="channel" defaultValue="PUSH">
            <option value="PUSH">Notificación de la app</option>
            <option value="EMAIL">Correo</option>
            <option value="SMS">SMS</option>
            <option value="MANUAL">Otro</option>
          </Select>
        </Field>
        <Field
          label="Remitente (opcional)"
          htmlFor="notice-sender"
          error={fieldError(state, "sender")}
        >
          <Input id="notice-sender" name="sender" placeholder="Banco de Chile, contacto@bci.cl…" />
        </Field>
      </div>
      <div className="flex gap-2">
        <SubmitButton>Agregar a la bandeja</SubmitButton>
        <CancelButton />
      </div>
    </ActionForm>
  );
}
