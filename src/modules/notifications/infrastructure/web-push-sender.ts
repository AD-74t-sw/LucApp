import webpush, { WebPushError } from "web-push";
import type { PushSender } from "../domain/push";

/** Sends through the browser vendors' push services, signed with the VAPID keys. */
export function createWebPushSender(keys: {
  publicKey: string;
  privateKey: string;
  subject: string;
}): PushSender {
  const options = {
    vapidDetails: keys,
    // A meal reminder is useless a few hours later.
    TTL: 60 * 60 * 4,
  };
  return {
    async send(target, payload) {
      try {
        await webpush.sendNotification(
          { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
          JSON.stringify(payload),
          options,
        );
        return "sent";
      } catch (error) {
        if (
          error instanceof WebPushError &&
          (error.statusCode === 404 || error.statusCode === 410)
        ) {
          return "gone";
        }
        throw error;
      }
    },
  };
}
