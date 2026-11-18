import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "../cn";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn("border-border bg-surface rounded-xs border p-4 sm:p-5", className)}
      {...props}
    />
  );
}

export function CardTitle({
  children,
  action,
  description,
}: {
  children: ReactNode;
  action?: ReactNode;
  description?: ReactNode;
}) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-medium">{children}</h2>
        {description ? <div className="text-muted mt-0.5 text-sm">{description}</div> : null}
      </div>
      {action ? <div className="shrink-0 whitespace-nowrap">{action}</div> : null}
    </header>
  );
}

/**
 * Title of a page.
 *
 * On phones the title and the back button go in the top bar: centered title,
 * back button on the left (the layout draws the bar and the avatar on the
 * right). The installed iPhone app has no browser back button, so sub-pages
 * pass `back` (the page they hang from). `phoneOnly` is for sections that
 * phones open from "Más" but desktops have in the sidebar.
 */
export function PageHeader({
  title,
  description,
  actions,
  back,
  barTitle,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string; phoneOnly?: boolean };
  /** Shorter title for the phone bar; the full title then stays in the page. */
  barTitle?: string;
}) {
  const titleInBar = barTitle === undefined;
  const emptyOnPhone = titleInBar && !description && !actions;
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 grid grid-cols-[2.25rem_1fr_2.25rem] items-end gap-2 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 lg:hidden">
        {back ? (
          <Link
            href={back.href}
            aria-label={`Volver a ${back.label}`}
            title={`Volver a ${back.label}`}
            className="border-border bg-surface hover:bg-surface-muted pointer-events-auto flex size-9 items-center justify-center rounded-xs border transition"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
        ) : (
          <span />
        )}
        {/* Same voice as the app's captions: uppercase mono, with the parent section above. */}
        <div className="flex h-9 min-w-0 flex-col items-center justify-end gap-1">
          {back && !back.phoneOnly ? (
            <span className="eyebrow text-[0.6875rem] leading-none" aria-hidden>
              {back.label}
            </span>
          ) : null}
          <h1 className="text-foreground max-w-full truncate font-mono text-[0.9375rem] leading-none font-medium tracking-[0.08em] uppercase">
            {barTitle ?? title}
          </h1>
        </div>
      </div>

      <header
        className={cn(
          "mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8",
          emptyOnPhone && "max-lg:hidden",
        )}
      >
        <div className="flex flex-col gap-2">
          {back && !back.phoneOnly ? (
            <Link
              href={back.href}
              className="text-muted hover:text-foreground mb-1 -ml-1 hidden w-fit items-center gap-1 rounded-xs py-1 pr-2 text-sm transition lg:inline-flex"
            >
              <ChevronLeft className="size-4" aria-hidden />
              {back.label}
            </Link>
          ) : null}
          <h1
            className={cn(
              "text-3xl leading-tight font-medium tracking-[-0.03em] sm:text-[2.5rem]",
              titleInBar && "hidden lg:block",
            )}
          >
            {title}
          </h1>
          {description ? <div className="text-muted text-base">{description}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </header>
    </>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="border-border flex flex-col items-center gap-2 rounded-xs border border-dashed px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {description ? <div className="text-muted max-w-sm text-sm">{description}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Status pills: tinted background, thin border of the same hue, square corners. */
const badgeTones = {
  neutral: "border-border bg-surface-muted text-muted",
  accent: "border-accent/30 bg-accent-soft text-accent",
  positive: "border-positive/30 bg-positive-soft text-positive",
  negative: "border-negative/30 bg-negative-soft text-negative",
  warning: "border-warning/30 bg-warning-soft text-warning",
} as const;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: keyof typeof badgeTones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xs border px-1.5 py-px text-xs whitespace-nowrap",
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function ColorDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "positive" | "negative";
}) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="eyebrow">{label}</p>
      <p
        className={cn(
          "tabular mt-1 text-[1.75rem] leading-tight font-medium tracking-[-0.03em]",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-muted text-xs">{hint}</p> : null}
    </Card>
  );
}

export function ProgressBar({
  ratio,
  tone = "accent",
}: {
  ratio: number;
  tone?: "accent" | "warning" | "negative";
}) {
  const width = `${Math.min(100, Math.max(0, ratio * 100)).toFixed(1)}%`;
  return (
    <div className="bg-surface-muted h-1.5 w-full overflow-hidden">
      <div
        className={cn(
          "h-full",
          tone === "accent" && "bg-accent",
          tone === "warning" && "bg-warning",
          tone === "negative" && "bg-negative",
        )}
        style={{ width }}
      />
    </div>
  );
}
