import type { CurrencyCode } from "@/shared/domain";
import { ColorDot, cn, formatMoney, formatPercent } from "@/shared/ui";

/** Ranked horizontal bars (magnitude): one hue, identity carried by the label and dot. */
export function RankedBars({
  items,
  currency,
}: {
  items: readonly { id: string; label: string; amount: number; color?: string; detail?: string }[];
  currency: CurrencyCode;
}) {
  const max = Math.max(...items.map((i) => i.amount), 1);
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id} title={`${item.label}: ${formatMoney(item.amount, currency)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              {item.color ? <ColorDot color={item.color} /> : null}
              <span className="truncate">{item.label}</span>
            </span>
            <span className="tabular shrink-0 font-medium">
              {formatMoney(item.amount, currency)}
            </span>
          </div>
          <div className="bg-surface-muted h-1.5 w-full">
            <div
              className="bg-series-1 h-full"
              style={{ width: `${Math.max(1, (item.amount / max) * 100)}%` }}
            />
          </div>
          {item.detail ? <p className="text-muted mt-1 text-xs">{item.detail}</p> : null}
        </li>
      ))}
    </ul>
  );
}

type Segment = { key: string; label: string; amount: number; className: string };

/**
 * 100% stacked bar for a part-to-whole split with 2-3 segments. Every segment is
 * labeled directly (name, share and amount), so identity never depends on color.
 */
export function SplitBar({
  title,
  segments,
  currency,
}: {
  title: string;
  segments: readonly Segment[];
  currency: CurrencyCode;
}) {
  const total = segments.reduce((sum, s) => sum + s.amount, 0);
  const visible = segments.filter((s) => s.amount > 0);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{title}</p>
      <div
        className="bg-surface-muted flex h-2.5 w-full gap-0.5 overflow-hidden"
        role="img"
        aria-label={title}
      >
        {total > 0
          ? visible.map((s) => (
              <div
                key={s.key}
                className={cn("h-full", s.className)}
                style={{ width: `${(s.amount / total) * 100}%` }}
                title={`${s.label}: ${formatMoney(s.amount, currency)}`}
              />
            ))
          : null}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs">
        {segments.map((s) => (
          <li key={s.key} className="text-muted flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm", s.className)} />
            <span className="text-foreground">{s.label}</span>
            {total > 0 ? formatPercent(s.amount / total) : "—"}
            <span className="tabular">· {formatMoney(s.amount, currency)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
