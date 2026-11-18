"use client";

import {
  type ComponentProps,
  type FormEvent,
  createContext,
  startTransition,
  useActionState,
  useContext,
  useEffect,
} from "react";
import { type ActionState, IDLE } from "../action-state";
import { cn } from "../cn";
import { useDialog } from "./dialog";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

const PendingContext = createContext(false);

/** True while the enclosing <ActionForm> is submitting. */
export function useFormPending(): boolean {
  return useContext(PendingContext);
}

/**
 * Runs a Server Action from a form and keeps what the person typed.
 *
 * A plain `<form action={...}>` in React 19 clears every field once the action
 * finishes, even when it returns validation errors. Submitting through
 * `onSubmit` keeps the values, so only the fields with errors need fixing.
 */
export function useFormAction(action: FormAction) {
  const [state, dispatch, pending] = useActionState(action, IDLE);
  const dialog = useDialog();
  useEffect(() => {
    // Inside a dialog, a successful save closes it (forms that redirect navigate instead).
    if (state.status === "success") dialog?.close();
  }, [state, dialog]);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };
  return { state, onSubmit, pending };
}

/** <form> wired to `useFormAction`; submit buttons inside read its pending state. */
export function ActionForm({
  form,
  children,
  ...props
}: Omit<ComponentProps<"form">, "onSubmit" | "action"> & {
  form: ReturnType<typeof useFormAction>;
}) {
  return (
    // `@container` lets fields switch to two columns based on the form's own width,
    // so the same form fits a wide page and a narrow side panel.
    <form
      onSubmit={form.onSubmit}
      aria-busy={form.pending}
      {...props}
      className={cn("@container", props.className)}
    >
      <PendingContext.Provider value={form.pending}>{children}</PendingContext.Provider>
    </form>
  );
}
