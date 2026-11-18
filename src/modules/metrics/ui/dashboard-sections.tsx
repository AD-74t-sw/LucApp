import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { CurrentUser } from "@/modules/identity";
import { CreditUsage } from "@/modules/accounts/ui";
import { type CurrencyCode, type LocalDate, type MonthKey } from "@/shared/domain";
import {
  Card,
  CardTitle,
  EmptyState,
  MoneyText,
  Stat,
  formatMoney,
  formatMonthShort,
  formatPercent,
} from "@/shared/ui";
import {
  getCategoryBreakdown,
  getClassificationBreakdown,
  getMonthSummary,
  getMonthlyTrend,
  getNetWorth,
  getSpendingByAccount,
  getUpcomingCommitments,
} from "../application/dashboard";
import { RankedBars, SplitBar } from "./bars";
import { MonthlyBarChart } from "./charts";

type Props = { user: CurrentUser; month: MonthKey; today: LocalDate };

const INCOME = { key: "income", label: "Ingresos", color: "var(--series-1)" };
const EXPENSE = { key: "expense", label: "Gastos", color: "var(--series-2)" };

function MissingRates({ currencies }: { currencies: readonly CurrencyCode[] }) {
  if (currencies.length === 0) return null;
  return (
    <p className="bg-warning-soft text-warning mt-3 flex items-center gap-2 rounded-xs px-3 py-2 text-xs">
      <AlertTriangle className="size-4 shrink-0" aria-hidden />
      Aún no se pudo obtener el dólar observado; los montos en {currencies.join(", ")} no se
      incluyen. Se reintenta automáticamente.
    </p>
  );
}

function change(current: number, previous: number): string | undefined {
  if (previous === 0) return undefined;
  const ratio = (current - previous) / previous;
  return `${ratio >= 0 ? "+" : ""}${formatPercent(ratio)} vs. mes anterior`;
}

export async function SummaryTiles({ user, month, today }: Props) {
  const summary = await getMonthSummary(user, month, today);
  const currency = user.baseCurrency;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          label="Ingresos"
          value={formatMoney(summary.income, currency)}
          hint={change(summary.income, summary.previous.income)}
          tone={summary.income > 0 ? "positive" : undefined}
        />
        <Stat
          label="Gastos"
          value={formatMoney(summary.expense, currency)}
          hint={change(summary.expense, summary.previous.expense) ?? "Incluye abonos a deudas"}
          tone={summary.expense > 0 ? "negative" : undefined}
        />
        <Stat
          label="Balance del mes"
          value={formatMoney(summary.net, currency, { signDisplay: "exceptZero" })}
          tone={summary.net > 0 ? "positive" : summary.net < 0 ? "negative" : undefined}
        />
        <Stat
          label="Tasa de ahorro"
          value={summary.savingsRate === null ? "—" : formatPercent(summary.savingsRate)}
          hint="Lo que no gastaste de tus ingresos"
        />
        <Link href="/debts" className="group col-span-2 lg:col-span-1">
          <Card className="group-hover:border-accent flex h-full flex-col gap-1 transition">
            <p className="eyebrow mb-1">Deudas pendientes</p>
            <p className="flex items-baseline justify-between gap-2">
              <span className="text-muted text-sm">Debes</span>
              <span className="tabular text-negative text-lg font-semibold">
                {formatMoney(summary.debts.iOwe, currency)}
              </span>
            </p>
            <p className="flex items-baseline justify-between gap-2">
              <span className="text-muted text-sm">Te deben</span>
              <span className="tabular text-positive text-lg font-semibold">
                {formatMoney(summary.debts.owedToMe, currency)}
              </span>
            </p>
            <p className="text-muted text-xs">Lo que abones se suma a tus gastos</p>
          </Card>
        </Link>
      </div>
      <MissingRates currencies={summary.missingRates} />
    </div>
  );
}

export async function NetWorthCard({ user, today }: Omit<Props, "month">) {
  const worth = await getNetWorth(user, today);
  const currency = user.baseCurrency;
  return (
    <Card>
      <CardTitle description="Saldos de tus cuentas menos deudas, más lo que te deben.">
        Patrimonio neto
      </CardTitle>
      <MoneyText
        amount={worth.total}
        currency={currency}
        colored
        className="text-3xl font-semibold tracking-tight"
      />
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted">En cuentas</dt>
          <dd className="font-medium">
            <MoneyText amount={worth.assets} currency={currency} colored />
          </dd>
        </div>
        <div>
          <dt className="text-muted">Deuda en tarjetas/cuentas</dt>
          <dd className="font-medium">
            <MoneyText
              amount={worth.liabilities}
              currency={currency}
              className={worth.liabilities > 0 ? "text-negative" : undefined}
            />
          </dd>
        </div>
        <div>
          <dt className="text-muted">Te deben</dt>
          <dd className="font-medium">
            <MoneyText amount={worth.owedToMe} currency={currency} colored />
          </dd>
        </div>
        <div>
          <dt className="text-muted">Debes a personas</dt>
          <dd className="font-medium">
            <MoneyText
              amount={worth.iOwe}
              currency={currency}
              className={worth.iOwe > 0 ? "text-negative" : undefined}
            />
          </dd>
        </div>
      </dl>
      {worth.creditCards.length > 0 ? (
        <div className="border-border mt-5 flex flex-col gap-4 border-t pt-4">
          <p className="text-sm font-medium">Tarjetas de crédito</p>
          {worth.creditCards.map((card) => (
            <div key={card.account.id} className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-2 text-sm">
                <Link href={`/accounts/${card.account.id}`} className="hover:underline">
                  {card.account.name}
                </Link>
                <span className="tabular text-right">
                  {formatMoney(-card.balance.posted, card.account.currency)}
                  {card.balance.secondary
                    ? ` + ${formatMoney(-card.balance.secondary.posted, card.balance.secondary.currency)} ${card.balance.secondary.currency}`
                    : ""}
                </span>
              </div>
              <CreditUsage account={card.account} balance={card.balance} />
            </div>
          ))}
        </div>
      ) : null}
      <MissingRates currencies={worth.missingRates} />
    </Card>
  );
}

export async function TrendCard({ user, month, today }: Props) {
  const { points, missingRates } = await getMonthlyTrend(user, month, today);
  const currency = user.baseCurrency;
  const data = points.map((p) => ({
    label: formatMonthShort(p.month),
    income: p.income,
    expense: p.expense,
  }));
  return (
    <Card>
      <CardTitle description="Últimos 12 meses">Ingresos y gastos</CardTitle>
      <MonthlyBarChart data={data} series={[INCOME, EXPENSE]} currency={currency} />
      <details className="mt-3 text-sm">
        <summary className="text-muted cursor-pointer">Ver tabla</summary>
        <table className="mt-2 w-full text-xs">
          <thead className="text-muted text-left">
            <tr>
              <th className="py-1 font-normal">Mes</th>
              <th className="py-1 text-right font-normal">Ingresos</th>
              <th className="py-1 text-right font-normal">Gastos</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {points.map((p) => (
              <tr key={p.month} className="border-border border-t">
                <td className="py-1">{formatMonthShort(p.month)}</td>
                <td className="py-1 text-right">{formatMoney(p.income, currency)}</td>
                <td className="py-1 text-right">{formatMoney(p.expense, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <MissingRates currencies={missingRates} />
    </Card>
  );
}

const MAX_CATEGORIES = 8;

export async function CategoryCard({ user, month, today }: Props) {
  const { slices, total, missingRates } = await getCategoryBreakdown(user, month, today);
  const currency = user.baseCurrency;
  const top = slices.slice(0, MAX_CATEGORIES);
  const rest = slices.slice(MAX_CATEGORIES);
  const items = [
    ...top.map((s) => ({
      id: s.id,
      label: `${s.name} · ${formatPercent(s.share)}`,
      amount: s.amount,
      color: s.color,
      detail: s.children
        .slice(0, 3)
        .map((c) => `${c.name} ${formatMoney(c.amount, currency)}`)
        .join(" · "),
    })),
    ...(rest.length > 0
      ? [
          {
            id: "other",
            label: `Otras (${rest.length})`,
            amount: rest.reduce((a, s) => a + s.amount, 0),
          },
        ]
      : []),
  ];
  return (
    <Card>
      <CardTitle
        description={`Total ${formatMoney(total, currency)}`}
        action={
          <Link href={`/transactions?kind=EXPENSE`} className="text-accent text-sm hover:underline">
            Ver gastos
          </Link>
        }
      >
        Gastos por categoría
      </CardTitle>
      {items.length === 0 ? (
        <EmptyState title="Sin gastos este mes" />
      ) : (
        <RankedBars items={items} currency={currency} />
      )}
      <MissingRates currencies={missingRates} />
    </Card>
  );
}

export async function ClassificationCard({ user, month, today }: Props) {
  const { split, total, missingRates } = await getClassificationBreakdown(user, month, today);
  const currency = user.baseCurrency;
  return (
    <Card>
      <CardTitle description="Según la clasificación de cada gasto">Tipo de gasto</CardTitle>
      {total === 0 ? (
        <EmptyState title="Sin gastos este mes" />
      ) : (
        <div className="flex flex-col gap-5">
          <SplitBar
            title="Fijo vs. variable"
            currency={currency}
            segments={[
              {
                key: "fixed",
                label: "Fijo",
                amount: split.costType.FIXED,
                className: "bg-series-1",
              },
              {
                key: "variable",
                label: "Variable",
                amount: split.costType.VARIABLE,
                className: "bg-series-2",
              },
              {
                key: "none",
                label: "Sin clasificar",
                amount: split.costType.UNCLASSIFIED,
                className: "bg-series-neutral",
              },
            ]}
          />
          <SplitBar
            title="Necesario vs. prescindible"
            currency={currency}
            segments={[
              {
                key: "essential",
                label: "Necesario",
                amount: split.necessity.ESSENTIAL,
                className: "bg-series-1",
              },
              {
                key: "discretionary",
                label: "Prescindible",
                amount: split.necessity.DISCRETIONARY,
                className: "bg-series-2",
              },
              {
                key: "none",
                label: "Sin clasificar",
                amount: split.necessity.UNCLASSIFIED,
                className: "bg-series-neutral",
              },
            ]}
          />
        </div>
      )}
      <MissingRates currencies={missingRates} />
    </Card>
  );
}

export async function AccountSpendCard({ user, month, today }: Props) {
  const { accounts, missingRates } = await getSpendingByAccount(user, month, today);
  const currency = user.baseCurrency;
  return (
    <Card>
      <CardTitle>Gastos por cuenta y tarjeta</CardTitle>
      {accounts.length === 0 ? (
        <EmptyState title="Sin gastos este mes" />
      ) : (
        <RankedBars
          currency={currency}
          items={accounts.map((a) => ({
            id: a.accountId,
            label: a.name,
            amount: a.amount,
            detail:
              a.cards.length > 1 || a.cards[0]?.cardId
                ? a.cards.map((c) => `${c.name} ${formatMoney(c.amount, currency)}`).join(" · ")
                : undefined,
          }))}
        />
      )}
      <MissingRates currencies={missingRates} />
    </Card>
  );
}

export async function CommitmentsCard({ user, today }: Omit<Props, "month">) {
  const { points, total, missingRates } = await getUpcomingCommitments(user, today);
  const currency = user.baseCurrency;
  return (
    <Card>
      <CardTitle
        description={`Cuotas por cobrar en los próximos 12 meses: ${formatMoney(total, currency)}`}
        action={
          <Link href="/installments" className="text-accent text-sm hover:underline">
            Ver cuotas
          </Link>
        }
      >
        Compromisos en cuotas
      </CardTitle>
      {total === 0 ? (
        <EmptyState title="No tienes cuotas pendientes" />
      ) : (
        <MonthlyBarChart
          data={points.map((p) => ({ label: formatMonthShort(p.month), amount: p.amount }))}
          series={[{ key: "amount", label: "Cuotas", color: "var(--series-1)" }]}
          currency={currency}
          height={200}
        />
      )}
      <MissingRates currencies={missingRates} />
    </Card>
  );
}
