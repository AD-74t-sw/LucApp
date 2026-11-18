import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { CurrentRateCard } from "@/modules/currencies/ui";
import { requireUser } from "@/modules/identity";
import { SettingsForm } from "@/modules/identity/ui";
import { getMealSettings } from "@/modules/meals";
import { MealSettingsForm } from "@/modules/meals/ui";
import { vapidPublicKey } from "@/modules/notifications";
import { PushSettings } from "@/modules/notifications/ui";
import { Card, CardTitle, PageHeader } from "@/shared/ui";
import { APP_COOKIE } from "../../apps";
import { MEALS_BACK, MORE_BACK } from "../nav-items";

export const metadata: Metadata = { title: "Ajustes" };

/** Shared by both apps: the back button returns to the one in use. */
export default async function SettingsPage() {
  const user = await requireUser();
  const [mealSettings, cookieStore] = await Promise.all([getMealSettings(user.id), cookies()]);
  const fromMeals = cookieStore.get(APP_COOKIE)?.value === "meals";
  return (
    <>
      <PageHeader back={fromMeals ? MEALS_BACK : MORE_BACK} title="Ajustes" />
      <div className="flex max-w-3xl flex-col gap-4">
        <Card>
          <CardTitle>Preferencias</CardTitle>
          <SettingsForm user={user} />
        </Card>
        <Card>
          <CardTitle>Notificaciones</CardTitle>
          <PushSettings publicKey={vapidPublicKey()} />
        </Card>
        <Card>
          <CardTitle description="Despensa y avisos de la app de comidas.">Comidas</CardTitle>
          <MealSettingsForm settings={mealSettings} />
        </Card>
        <Suspense fallback={<div className="bg-surface-muted h-40 animate-pulse" />}>
          <CurrentRateCard />
        </Suspense>
      </div>
    </>
  );
}
