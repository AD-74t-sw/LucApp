/** What a notification shows, and the page it opens when tapped. */
export type PushPayload = Readonly<{
  title: string;
  body: string;
  /** Path inside the app, e.g. "/meals?date=2026-11-18". */
  url: string;
  /** Notifications with the same tag replace each other on the device. */
  tag?: string;
}>;

/** A browser or installed app that accepted notifications (Web Push subscription). */
export type PushTarget = Readonly<{ endpoint: string; p256dh: string; auth: string }>;

/**
 * Port to the push service. "gone" means the subscription no longer exists
 * (the person revoked it or reinstalled the app) and can be forgotten.
 */
export interface PushSender {
  send(target: PushTarget, payload: PushPayload): Promise<"sent" | "gone">;
}

export type NotifyOutcome =
  /** Delivered to at least one device. */
  | "sent"
  /** Already sent before under the same key. */
  | "duplicate"
  /** The person has no device with notifications on. */
  | "no_devices"
  /** The server has no push keys configured. */
  | "disabled";
