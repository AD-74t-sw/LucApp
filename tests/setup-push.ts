import { type PushPayload, type PushTarget, setPushSender } from "@/modules/notifications";

/**
 * Tests never call the real push services: notifications are recorded here.
 * An endpoint containing "gone" behaves like a revoked subscription.
 */
export const sentPushes: { target: PushTarget; payload: PushPayload }[] = [];

setPushSender({
  async send(target, payload) {
    if (target.endpoint.includes("gone")) return "gone";
    sentPushes.push({ target, payload });
    return "sent";
  },
});
