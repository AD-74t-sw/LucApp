"use client";

import { Check, Copy } from "lucide-react";
import { useActionState, useState } from "react";
import { Button, Field, Input, cn } from "@/shared/ui";
import { type TokenState, createTokenAction } from "./actions";

const IDLE: TokenState = { status: "idle" };

/** Copies a value to the clipboard and says so for a moment. */
export function CopyButton({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Copiado" : label}
    </Button>
  );
}

/**
 * Creates a token for a device's Shortcuts. The token is shown only here, once:
 * LucApp keeps just a fingerprint of it.
 */
export function CreateTokenForm() {
  const [state, action, pending] = useActionState(createTokenAction, IDLE);
  if (state.status === "created") {
    return (
      <div className="border-accent/30 bg-accent-soft flex flex-col gap-3 rounded-xs border p-4">
        <p className="text-sm font-medium">Token de «{state.name}»</p>
        <code className="bg-surface border-border block overflow-x-auto border px-3 py-2 font-mono text-sm break-all">
          {state.token}
        </code>
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton value={state.token} label="Copiar token" />
          <p className="text-muted text-xs">
            Cópialo ahora en tu atajo: después no se puede volver a ver.
          </p>
        </div>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <Field label="Nombre del dispositivo" htmlFor="token-name" className="flex-1">
          <Input id="token-name" name="name" required maxLength={60} placeholder="iPhone" />
        </Field>
        <Button type="submit" disabled={pending} className={cn(pending && "opacity-60")}>
          Crear token
        </Button>
      </div>
      {state.status === "error" ? <p className="text-danger text-xs">{state.message}</p> : null}
    </form>
  );
}
