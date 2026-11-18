"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import type { ActionState } from "../action-state";
import { cn } from "../cn";
import { Button } from "./button";
import { useFormPending } from "./form";

export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const status = useFormStatus();
  const contextPending = useFormPending();
  const pending = status.pending || contextPending;
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? (pendingLabel ?? "Guardando…") : children}
    </Button>
  );
}

export function FormAlert({ state }: { state: ActionState }) {
  if (state.status === "idle") return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xs px-3 py-2 text-sm",
        state.status === "error" ? "bg-danger-soft text-danger" : "bg-positive-soft text-positive",
      )}
    >
      {state.message}
    </p>
  );
}

/** Returns the error for a field, if the last submission produced one. */
export function fieldError(state: ActionState, field: string): string | undefined {
  return state.status === "error" ? state.fieldErrors[field] : undefined;
}

/** Submit button that asks for confirmation before running a destructive action. */
export function ConfirmButton({
  message,
  children,
  ...props
}: ComponentProps<typeof Button> & { message: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
