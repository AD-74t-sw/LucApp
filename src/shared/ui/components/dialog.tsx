"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ComponentProps,
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../cn";
import { Button, buttonClasses } from "./button";

/** Lets content inside a dialog close it (forms close it after saving). */
const DialogContext = createContext<{ close: () => void } | null>(null);

export function useDialog() {
  return useContext(DialogContext);
}

/**
 * Modal dialog on the native <dialog> element: focus is trapped, Esc closes it
 * and the page behind becomes inert. Clicking the backdrop also closes it.
 */
export function Dialog({
  title,
  description,
  onClose,
  size = "md",
  children,
}: {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  size?: "md" | "lg";
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // Keep the latest onClose without changing the context value on every render,
  // so a form's "close on success" effect runs once per save.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  const context = useMemo(() => ({ close: () => onCloseRef.current() }), []);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // A click on the <dialog> itself (not its content) is a click on the backdrop.
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "border-border bg-surface text-foreground m-auto max-h-[90dvh] w-[calc(100%-2rem)] border p-0",
        "backdrop:bg-black/40 backdrop:backdrop-blur-[1px]",
        size === "md" ? "max-w-xl" : "max-w-3xl",
      )}
    >
      <DialogContext.Provider value={context}>
        <div className="border-border bg-surface sticky top-0 z-10 flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 id={titleId} className="text-xl font-medium tracking-[-0.02em]">
              {title}
            </h2>
            {description ? <div className="text-muted mt-1 text-sm">{description}</div> : null}
          </div>
          <Button variant="ghost" size="icon" aria-label="Cerrar" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </DialogContext.Provider>
    </dialog>
  );
}

/** A button that opens a form in a dialog. The dialog closes when the form saves. */
export function FormDialog({
  trigger,
  title,
  description,
  size,
  variant = "primary",
  buttonSize = "sm",
  icon,
  ariaLabel,
  children,
}: {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  size?: "md" | "lg";
  variant?: ComponentProps<typeof Button>["variant"];
  buttonSize?: ComponentProps<typeof Button>["size"];
  icon?: ReactNode;
  ariaLabel?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={buttonSize}
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
      >
        {icon}
        {trigger}
      </Button>
      {open ? (
        <Dialog title={title} description={description} size={size} onClose={() => setOpen(false)}>
          {children}
        </Dialog>
      ) : null}
    </>
  );
}

/**
 * Dialog for an intercepted route (e.g. /accounts/new opened from a list):
 * closing it goes back to the page underneath.
 */
export function RouteDialog({
  title,
  description,
  size,
  children,
}: {
  title: string;
  description?: ReactNode;
  size?: "md" | "lg";
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <Dialog title={title} description={description} size={size} onClose={() => router.back()}>
      {children}
    </Dialog>
  );
}

/**
 * "Cancelar": closes the surrounding dialog, or goes to `href` on a full page
 * (without `href` it only shows inside a dialog).
 */
export function CancelButton({ href }: { href?: string }) {
  const dialog = useDialog();
  if (dialog) {
    return (
      <Button type="button" variant="secondary" onClick={dialog.close}>
        Cancelar
      </Button>
    );
  }
  if (!href) return null;
  return (
    <Link href={href} className={buttonClasses({ variant: "secondary" })}>
      Cancelar
    </Link>
  );
}
