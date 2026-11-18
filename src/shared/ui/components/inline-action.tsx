"use client";

import { useActionState, type ReactNode } from "react";
import { type ActionState, IDLE } from "../action-state";
import { cn } from "../cn";
import { Button } from "./button";
import { ConfirmButton } from "./form-feedback";

type InlineAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * A single-button form (archive, delete, mark as paid…) bound to a Server Action.
 * Shows the action's error inline.
 */
export function InlineAction({
  action,
  label,
  confirm,
  variant = "ghost",
  className,
  icon,
}: {
  action: InlineAction;
  label: string;
  confirm?: string;
  variant?: "ghost" | "secondary" | "danger";
  className?: string;
  icon?: ReactNode;
}) {
  const [state, formAction] = useActionState(action, IDLE);
  return (
    <form action={formAction} className={cn("inline-flex flex-col items-end gap-1", className)}>
      {confirm ? (
        <ConfirmButton message={confirm} variant={variant} size="sm">
          {icon}
          {label}
        </ConfirmButton>
      ) : (
        <Button type="submit" variant={variant} size="sm">
          {icon}
          {label}
        </Button>
      )}
      {state.status === "error" ? (
        <span role="alert" className="text-danger max-w-64 text-right text-xs">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
