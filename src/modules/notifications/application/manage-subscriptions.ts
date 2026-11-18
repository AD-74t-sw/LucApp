import { z } from "zod";
import { type Result, ok } from "@/shared/domain";
import { subscriptionRepository } from "../infrastructure/subscription-repository";

/** The JSON of a browser PushSubscription (`subscription.toJSON()`). */
export const subscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/, error: "Suscripción inválida." }).max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});
export type SubscriptionInput = z.infer<typeof subscriptionSchema>;

export async function subscribe(
  userId: string,
  input: SubscriptionInput,
  userAgent: string | null,
): Promise<Result<void>> {
  await subscriptionRepository.save(
    userId,
    { endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth },
    userAgent?.slice(0, 300) ?? null,
  );
  return ok();
}

export async function unsubscribe(userId: string, endpoint: string): Promise<Result<void>> {
  await subscriptionRepository.remove(userId, endpoint);
  return ok();
}

export function countDevices(userId: string): Promise<number> {
  return subscriptionRepository.count(userId);
}
