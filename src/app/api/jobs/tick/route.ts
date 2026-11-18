import { runMealNotifications } from "@/modules/meals";
import { isJobRequestAuthorized } from "@/modules/notifications";

/**
 * Runs the scheduled jobs once (meal reminders, pantry alert). For hosts that
 * sleep between requests, where the in-process scheduler cannot tick: point a
 * cron at it every minute with `Authorization: Bearer <CRON_SECRET>`.
 * Safe to call as often as wanted: each notification goes out once.
 */
export async function POST(request: Request) {
  if (!isJobRequestAuthorized(request.headers.get("authorization"))) {
    return new Response(null, { status: 404 });
  }
  return Response.json(await runMealNotifications(new Date()));
}
