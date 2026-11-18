import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "../cn";

/** Primary = solid black; secondary = outlined; ghost = text only; danger = red outline. */
const variants = {
  primary: "bg-primary text-primary-foreground hover:opacity-85",
  secondary: "border border-border-strong bg-surface text-foreground hover:bg-surface-muted",
  ghost: "text-foreground hover:bg-surface-muted",
  danger: "border border-danger bg-surface text-danger hover:bg-danger-soft",
} as const;

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  icon: "h-9 w-9",
} as const;

type StyleProps = { variant?: keyof typeof variants; size?: keyof typeof sizes };

export function buttonClasses({ variant = "primary", size = "md" }: StyleProps = {}): string {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-xs font-medium whitespace-nowrap transition",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
  );
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"button"> & StyleProps) {
  return <button className={cn(buttonClasses({ variant, size }), className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={cn(buttonClasses({ variant, size }), className)} {...props} />;
}
