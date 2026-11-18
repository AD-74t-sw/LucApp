import { env } from "@/shared/infrastructure";
import type { PushSender } from "../domain/push";
import { createWebPushSender } from "../infrastructure/web-push-sender";

/** undefined = not resolved yet; null = push is not configured on this server. */
let current: PushSender | null | undefined;

/** Tests install a fake sender, so they never call the real push services. */
export function setPushSender(sender: PushSender | null): void {
  current = sender;
}

export function getPushSender(): PushSender | null {
  if (current !== undefined) return current;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = env();
  current =
    VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY
      ? createWebPushSender({
          publicKey: VAPID_PUBLIC_KEY,
          privateKey: VAPID_PRIVATE_KEY,
          subject: VAPID_SUBJECT ?? "mailto:notificaciones@lucapp.local",
        })
      : null;
  return current;
}

/** Public key the browser subscribes with, or null when push is off. */
export function vapidPublicKey(): string | null {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = env();
  return VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY ? VAPID_PUBLIC_KEY : null;
}
