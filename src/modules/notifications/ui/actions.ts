"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { requireUser } from "@/modules/identity";
import type { ActionState } from "@/shared/ui/action-state";
import { errorState, successState } from "@/shared/ui/server/form";
import { subscribe, subscriptionSchema, unsubscribe } from "../application/manage-subscriptions";
import { sendTestNotification } from "../application/notify";

/** Called by the browser right after it subscribes (the argument is `subscription.toJSON()`). */
export async function savePushSubscriptionAction(subscription: unknown): Promise<ActionState> {
  const parsed = subscriptionSchema.safeParse(subscription);
  if (!parsed.success) {
    return {
      status: "error",
      message: "El navegador entregó una suscripción inválida.",
      fieldErrors: {},
    };
  }
  const user = await requireUser();
  const result = await subscribe(user.id, parsed.data, (await headers()).get("user-agent"));
  if (!result.ok) return errorState(result.error);
  return successState("Notificaciones activadas en este dispositivo.");
}

export async function removePushSubscriptionAction(endpoint: string): Promise<ActionState> {
  const user = await requireUser();
  const result = await unsubscribe(user.id, z.string().max(1000).parse(endpoint));
  if (!result.ok) return errorState(result.error);
  return successState("Notificaciones desactivadas en este dispositivo.");
}

export async function sendTestPushAction(): Promise<ActionState> {
  const user = await requireUser();
  const result = await sendTestNotification(user.id);
  if (!result.ok) return errorState(result.error);
  return successState("Notificación de prueba enviada.");
}
