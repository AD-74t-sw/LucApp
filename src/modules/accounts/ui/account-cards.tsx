import Link from "next/link";
import { CreditCard, Landmark, PiggyBank, Smartphone, Wallet } from "lucide-react";
import type { CurrencyCode } from "@/shared/domain";
import { Badge, Card, MoneyText, ProgressBar, cn, formatMoney, formatPercent } from "@/shared/ui";
import { type Account, type AccountType, isCreditAccount } from "../domain/account";
import { groupByInstitution } from "./account-groups";
import { InstitutionLogo } from "./institution-logo";
import { ACCOUNT_TYPE_LABELS } from "./labels";

/** Balance as computed by the transactions module (structural type, no import needed). */
type Amounts = { posted: number; scheduled: number };
type Balance = Amounts & { secondary?: (Amounts & { currency: CurrencyCode }) | null };

const ICONS: Record<AccountType, typeof Wallet> = {
  CHECKING: Landmark,
  SAVINGS: PiggyBank,
  CASH: Wallet,
  DIGITAL_WALLET: Smartphone,
  CREDIT_CARD: CreditCard,
};

export function AccountIcon({ type, className }: { type: AccountType; className?: string }) {
  const Icon = ICONS[type];
  return <Icon className={className ?? "size-4"} aria-hidden />;
}

/** Usage of one credit line, counting future installments as already committed. */
export function CreditLineUsage({
  limit,
  currency,
  balance,
  label,
}: {
  limit: number | null;
  currency: CurrencyCode;
  balance: Amounts;
  label?: string | undefined;
}) {
  if (!limit) return null;
  const committed = balance.posted + balance.scheduled;
  const usage = Math.max(0, -committed) / limit;
  return (
    <div className="flex flex-col gap-1.5">
      <ProgressBar
        ratio={usage}
        tone={usage > 0.9 ? "negative" : usage > 0.7 ? "warning" : "accent"}
      />
      <div className="text-muted flex justify-between gap-2 text-xs">
        <span>
          {label ? `${label} · ` : ""}Usado {formatPercent(usage)}
        </span>
        <span>Disponible {formatMoney(limit + committed, currency)}</span>
      </div>
    </div>
  );
}

/** National line and, for dual-currency cards, the international one. */
export function CreditUsage({ account, balance }: { account: Account; balance: Balance }) {
  const secondary = account.secondaryCurrency ? balance.secondary : null;
  return (
    <div className="flex flex-col gap-3">
      <CreditLineUsage
        limit={account.creditLimit}
        currency={account.currency}
        balance={balance}
        label={secondary ? `Nacional ${account.currency}` : undefined}
      />
      {secondary ? (
        <CreditLineUsage
          limit={account.secondaryCreditLimit}
          currency={secondary.currency}
          balance={secondary}
          label={`Internacional ${secondary.currency}`}
        />
      ) : null}
    </div>
  );
}

/** Debt of a card in one currency, plus what is already committed in future installments. */
export function DebtLine({ amounts, currency }: { amounts: Amounts; currency: CurrencyCode }) {
  return (
    <div>
      <MoneyText amount={-amounts.posted} currency={currency} className="text-xl font-medium" />
      <span className="text-muted ml-1.5 text-xs">{currency}</span>
      {amounts.scheduled !== 0 ? (
        <p className="text-muted text-xs">
          + {formatMoney(-amounts.scheduled, currency)} en cuotas por venir
        </p>
      ) : null}
    </div>
  );
}

/** Grid of account tiles with their current balance. */
/** Accounts grouped by bank, each group with its logo and the sum of its balances. */
export function AccountGrid({
  accounts,
  balances,
}: {
  accounts: readonly Account[];
  balances: ReadonlyMap<string, Balance>;
}) {
  const balanceOf = (account: Account): Balance =>
    balances.get(account.id) ?? { posted: account.openingBalance, scheduled: 0, secondary: null };
  return (
    <div className="flex flex-col gap-8">
      {groupByInstitution(accounts).map((group) => {
        const totals = new Map<CurrencyCode, number>();
        for (const account of group.accounts) {
          if (isCreditAccount(account.type)) continue;
          totals.set(
            account.currency,
            (totals.get(account.currency) ?? 0) + balanceOf(account).posted,
          );
        }
        const title =
          group.name ??
          (group.accounts.every((a) => a.type === "CASH") ? "Efectivo" : "Sin institución");
        const headingId = `group-${group.key}`;
        return (
          <section key={group.key} aria-labelledby={headingId} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <InstitutionLogo
                name={group.name}
                size={32}
                fallback={
                  <span className="border-border bg-surface text-muted flex size-8 shrink-0 items-center justify-center rounded-xs border">
                    <AccountIcon type={group.name ? "CHECKING" : "CASH"} />
                  </span>
                }
              />
              <div className="min-w-0 flex-1">
                <h2 id={headingId} className="truncate text-lg font-medium tracking-[-0.02em]">
                  {title}
                </h2>
                <p className="text-muted text-xs">
                  {group.accounts.length === 1 ? "1 cuenta" : `${group.accounts.length} cuentas`}
                  {[...totals].map(
                    ([currency, total]) => ` · Saldo ${formatMoney(total, currency)}`,
                  )}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.accounts.map((account) => (
                <AccountTile key={account.id} account={account} balance={balanceOf(account)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function AccountTile({ account, balance }: { account: Account; balance: Balance }) {
  const credit = isCreditAccount(account.type);
  return (
    <Link href={`/accounts/${account.id}`} className="group">
      <Card className="group-hover:border-border-strong flex h-full flex-col gap-3 transition">
        <div className="flex items-start gap-3">
          <span className="border-border bg-surface-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-xs border">
            <AccountIcon type={account.type} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{account.name}</p>
            <p className="text-muted truncate text-xs">
              {ACCOUNT_TYPE_LABELS[account.type]}
              {account.secondaryCurrency
                ? ` · ${account.currency} + ${account.secondaryCurrency}`
                : ""}
            </p>
          </div>
          {account.archived ? <Badge tone="warning">Archivada</Badge> : null}
        </div>
        {credit ? (
          <div className="flex flex-col gap-2">
            <p className="eyebrow">Deuda actual</p>
            <DebtLine amounts={balance} currency={account.currency} />
            {balance.secondary ? (
              <DebtLine amounts={balance.secondary} currency={balance.secondary.currency} />
            ) : null}
          </div>
        ) : (
          <div>
            <p className="eyebrow">Saldo</p>
            <MoneyText
              amount={balance.posted}
              currency={account.currency}
              className={cn("text-xl font-medium", balance.posted < 0 && "text-negative")}
            />
            <span className="text-muted ml-1.5 text-xs">{account.currency}</span>
          </div>
        )}
        {credit ? <CreditUsage account={account} balance={balance} /> : null}
      </Card>
    </Link>
  );
}
