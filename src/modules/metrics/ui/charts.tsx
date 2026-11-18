"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { CurrencyCode } from "@/shared/domain";
import { formatMoney } from "@/shared/ui";

type Series = { key: string; label: string; color: string };

/** Tooltip in text tokens; the colored swatch carries series identity. */
function ChartTooltip({
  active,
  payload,
  label,
  series,
  currency,
}: TooltipContentProps<number, string> & { series: readonly Series[]; currency: CurrencyCode }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border-border bg-surface rounded-xs border px-3 py-2 text-xs shadow-sm">
      <p className="text-foreground mb-1 font-medium">{label}</p>
      {series.map((s) => {
        const entry = payload.find((p) => p.dataKey === s.key);
        if (!entry) return null;
        return (
          <p key={s.key} className="text-muted flex items-center gap-2">
            <span className="size-2 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.label}
            <span className="tabular text-foreground ml-auto pl-3 font-medium">
              {formatMoney(Number(entry.value ?? 0), currency)}
            </span>
          </p>
        );
      })}
    </div>
  );
}

function Legend({ series }: { series: readonly Series[] }) {
  if (series.length < 2) return null;
  return (
    <ul className="text-muted mb-2 flex flex-wrap gap-4 text-xs">
      {series.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * Vertical bar chart for amounts over months (one axis, thin bars with rounded
 * data ends, recessive grid, hover tooltip). Amounts are minor units.
 */
export function MonthlyBarChart({
  data,
  series,
  currency,
  height = 240,
}: {
  data: readonly ({ label: string } & Record<string, number | string>)[];
  series: readonly Series[];
  currency: CurrencyCode;
  height?: number;
}) {
  return (
    <div>
      <Legend series={series} />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={[...data]}
            barGap={2}
            barCategoryGap="28%"
            margin={{ top: 4, right: 4, bottom: 0, left: 4 }}
          >
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              tickFormatter={(value: number) => formatMoney(value, currency, { compact: true })}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-muted)" }}
              content={(props) => (
                <ChartTooltip
                  {...(props as TooltipContentProps<number, string>)}
                  series={series}
                  currency={currency}
                />
              )}
            />
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color}
                radius={[2, 2, 0, 0]}
                maxBarSize={18}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
