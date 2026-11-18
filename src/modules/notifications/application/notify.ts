import { type Result, ok, validationError } from "@/shared/domain";
import type { NotifyOutcome, PushPayload } from "../domain/push";
import {
  deliveryRepository,
  subscriptionRepository,
} from "../infrastructure/subscription-repository";
import { getPushSender } from "./push-sender";

/** Sends `payload` to every device of the user. Returns how many got it. */
async function sendToDevices(userId: string, payload: PushPayload): Promise<number> {
  const sender = getPushSender();
  if (!sender) return 0;
  let delivered = 0;
  for (const target of await subscriptionRepository.listFor(userId)) {
    try {
      const outcome = await sender.send(target, payload);
      if (outcome === "gone") await subscriptionRepository.removeGone(target.endpoint);
      else delivered += 1;
    } catch (error) {
      // One broken device must not stop the others (nor the scheduler).
      console.error("[notifications] push failed", error);
    }
  }
  return delivered;
}

/**
 * Sends a notification at most once per `key` ("meal:<block>:<date>"). The
 * key is claimed before sending, so two scheduler runs at the same time (or
 * a ticker plus an external cron) never send it twice.
 */
export async function notifyOnce(
  userId: string,
  key: string,
  payload: PushPayload,
): Promise<NotifyOutcome> {
  if (!getPushSender()) return "disabled";
  if ((await subscriptionRepository.count(userId)) === 0) return "no_devices";
  if (!(await deliveryRepository.claim(userId, key))) return "duplicate";
  return (await sendToDevices(userId, payload)) > 0 ? "sent" : "no_devices";
}

/** "Enviar prueba" in settings. */
export async function sendTestNotification(userId: string): Promise<Result<number>> {
  if (!getPushSender()) {
    return validationError("Las notificaciones no están configuradas en el servidor.");
  }
  const delivered = await sendToDevices(userId, {
    title: "LucApp",
    body: "Las notificaciones funcionan en este dispositivo.",
    url: "/settings",
    tag: "test",
  });
  if (delivered === 0) {
    return validationError("No hay dispositivos con las notificaciones activadas.");
  }
  return ok(delivered);
}

/** Keys already sent with this prefix (lets callers skip work before claiming). */
export function sentKeys(userId: string, prefix: string): Promise<Set<string>> {
  return deliveryRepository.sentKeys(userId, prefix);
}

/** Users with at least one device, for jobs that notify across users. */
export function usersWithDevices(): Promise<string[]> {
  return subscriptionRepository.usersWithDevices();
}
