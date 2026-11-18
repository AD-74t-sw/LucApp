import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireUser } from "@/modules/identity";
import { getDay, getPantry } from "@/modules/meals";
import { DayBlocks, ShortageBanner } from "@/modules/meals/ui";
import { vapidPublicKey } from "@/modules/notifications";
import { PushSettings } from "@/modules/notifications/ui";
import { type LocalDate, addDays, isLocalDate, timeIn, today as todayIn } from "@/shared/domain";
import { ButtonLink, PageHeader, formatDate } from "@/shared/ui";

export const metadata: Metadata = { title: "Comidas" };

function dayName(date: LocalDate, today: LocalDate): string {
  if (date === today) return "Hoy";
  if (date === addDays(today, 1)) return "Mañana";
  if (date === addDays(today, -1)) return "Ayer";
  return formatDate(date);
}

/** The day's blocks: plan ahead, mark as eaten, see what is missing at home. */
export default async function MealsDayPage({ searchParams }: PageProps<"/meals">) {
  const user = await requireUser();
  const today = todayIn(user.timezone);
  const { date: raw } = await searchParams;
  const date = typeof raw === "string" && isLocalDate(raw) ? raw : today;
  const [day, pantry] = await Promise.all([getDay(user.id, date), getPantry(user.id)]);
  const missing = pantry.coverage.filter((c) => c.missing > 0);
  const title = dayName(date, today);

  return (
    <>
      <PageHeader
        title={title}
        description={title === formatDate(date) ? undefined : formatDate(date)}
      />
      <nav aria-label="Día" className="mb-5 flex items-center gap-2">
        <ButtonLink
          href={`/meals?date=${addDays(date, -1)}`}
          variant="secondary"
          size="icon"
          aria-label="Día anterior"
        >
          <ChevronLeft className="size-4" />
        </ButtonLink>
        <ButtonLink
          href={`/meals?date=${addDays(date, 1)}`}
          variant="secondary"
          size="icon"
          aria-label="Día siguiente"
        >
          <ChevronRight className="size-4" />
        </ButtonLink>
        {date === today ? null : (
          <ButtonLink href="/meals" variant="ghost" size="sm" className="ml-auto">
            Volver a hoy
          </ButtonLink>
        )}
      </nav>
      <div className="mb-5 flex flex-col gap-3 empty:hidden">
        <PushSettings publicKey={vapidPublicKey()} compact />
        <ShortageBanner
          shortages={missing}
          categories={pantry.categories}
          days={pantry.settings.coverageDays}
        />
      </div>
      <DayBlocks
        blocks={day.blocks}
        meals={day.meals}
        date={date}
        today={today}
        now={date === today ? timeIn(user.timezone) : null}
        foods={pantry.foods}
        categories={pantry.categories}
      />
    </>
  );
}
