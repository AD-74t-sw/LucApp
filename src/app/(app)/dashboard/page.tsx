import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight, Inbox, ReceiptText } from "lucide-react";
import { requireUser } from "@/modules/identity";
import { countPendingNotices } from "@/modules/inbox";
import { getReimbursementTotals } from "@/modules/reimbursements";
import {
  AccountSpendCard,
  CategoryCard,
  ClassificationCard,
  CommitmentsCard,
  NetWorthCard,
  SummaryTiles,
  TrendCard,
} from "@/modules/metrics/ui";
import {
  type LocalDate,
  addMonthsToKey,
  isMonthKey,
  monthOf,
  today as todayIn,
} from "@/shared/domain";
import { PageHeader, formatMoney, formatMonth } from "@/shared/ui";

export const metadata: Metadata = { title: "Resumen" };

function SectionSkeleton({ height = "h-64" }: { height?: string }) {
  return <div className={`${height} bg-surface-muted animate-pulse rounded-xs`} />;
}

/** Reminder of bank notices waiting to be categorized. */
async function PendingNoticesBanner({ userId }: { userId: string }) {
  const count = await countPendingNotices(userId);
  if (count === 0) return null;
  return (
    <Link
      href="/inbox"
      className="border-accent/30 bg-accent-soft text-accent hover:border-accent flex items-center gap-3 rounded-xs border px-4 py-3 text-sm transition"
    >
      <Inbox className="size-4" aria-hidden />
      <span className="flex-1">
        {count === 1
          ? "Tienes 1 aviso del banco por revisar."
          : `Tienes ${count} avisos del banco por revisar.`}
      </span>
      <ChevronRight className="size-4" aria-hidden />
    </Link>
  );
}

/** Money expected back from the health plan, insurers…: kept in mind, not counted yet. */
async function PendingReimbursementsBanner({
  userId,
  today,
}: {
  userId: string;
  today: LocalDate;
}) {
  const totals = await getReimbursementTotals(userId, today);
  const approved = totals.filter((t) => t.approved > 0);
  const inReview = totals.reduce((n, t) => n + t.inReviewCount, 0);
  const late = totals.reduce((n, t) => n + t.lateCount, 0);
  if (approved.length === 0 && inReview === 0) return null;
  const parts = [
    approved.length > 0
      ? `Esperas ${approved.map((t) => formatMoney(t.approved, t.currency)).join(" + ")} en devoluciones`
      : null,
    inReview > 0 ? `${inReview} en revisión` : null,
    late > 0 ? `${late} atrasada${late === 1 ? "" : "s"}` : null,
  ].filter(Boolean);
  return (
    <Link
      href="/reimbursements"
      className="border-border bg-surface hover:border-accent flex items-center gap-3 rounded-xs border px-4 py-3 text-sm transition"
    >
      <ReceiptText className="text-muted size-4" aria-hidden />
      <span className="flex-1">
        {approved.length === 0 ? "Devoluciones: " : ""}
        {parts.join(" · ")}.
      </span>
      <ChevronRight className="text-muted size-4" aria-hidden />
    </Link>
  );
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser();
  const today = todayIn(user.timezone);
  const requested = (await searchParams).month;
  const month = typeof requested === "string" && isMonthKey(requested) ? requested : monthOf(today);
  const props = { user, month, today };

  return (
    <>
      <PageHeader
        title={`Hola, ${user.name.split(" ")[0]}`}
        barTitle="Resumen"
        description="Tu resumen financiero, en tu moneda principal."
        actions={
          <div className="border-border bg-surface flex items-center gap-1 rounded-xs border p-1">
            <Link
              href={`/dashboard?month=${addMonthsToKey(month, -1)}`}
              aria-label="Mes anterior"
              className="hover:bg-surface-muted rounded-xs p-1.5"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <span className="min-w-36 text-center text-sm font-medium">{formatMonth(month)}</span>
            <Link
              href={`/dashboard?month=${addMonthsToKey(month, 1)}`}
              aria-label="Mes siguiente"
              className="hover:bg-surface-muted rounded-xs p-1.5"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
        }
      />
      <div className="flex flex-col gap-4">
        <Suspense fallback={null}>
          <PendingNoticesBanner userId={user.id} />
        </Suspense>
        <Suspense fallback={null}>
          <PendingReimbursementsBanner userId={user.id} today={today} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton height="h-24" />}>
          <SummaryTiles {...props} />
        </Suspense>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Suspense fallback={<SectionSkeleton height="h-80" />}>
              <TrendCard {...props} />
            </Suspense>
          </div>
          <Suspense fallback={<SectionSkeleton height="h-80" />}>
            <NetWorthCard user={user} today={today} />
          </Suspense>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Suspense fallback={<SectionSkeleton />}>
            <CategoryCard {...props} />
          </Suspense>
          <div className="flex flex-col gap-4">
            <Suspense fallback={<SectionSkeleton height="h-48" />}>
              <ClassificationCard {...props} />
            </Suspense>
            <Suspense fallback={<SectionSkeleton height="h-48" />}>
              <AccountSpendCard {...props} />
            </Suspense>
          </div>
        </div>
        <Suspense fallback={<SectionSkeleton height="h-60" />}>
          <CommitmentsCard user={user} today={today} />
        </Suspense>
      </div>
    </>
  );
}
