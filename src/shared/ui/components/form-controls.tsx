import type { ComponentProps, ReactNode } from "react";
import { cn } from "../cn";

const controlClasses =
  "w-full rounded-xs border border-border bg-surface px-3 text-base text-foreground sm:text-sm placeholder:text-muted " +
  "focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60 " +
  "aria-[invalid=true]:border-danger";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClasses, "h-10", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(controlClasses, "h-10 pr-8", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlClasses, "min-h-20 py-2", className)} {...props} />;
}

/** Label + control + hint/error, laid out consistently in every form. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | undefined;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-danger text-xs">
          {error}
        </p>
      ) : hint ? (
        <p className="text-muted text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({ label, ...props }: ComponentProps<"input"> & { label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="accent-accent size-4" {...props} />
      {label}
    </label>
  );
}
