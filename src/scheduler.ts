import { runMealNotifications } from "@/modules/meals";

/**
 * In-process scheduler: once a minute, sends what is due (meal reminders and
 * the daily pantry alert). Every notification is claimed once by key, so a
 * second server, a restart or an external cron hitting /api/jobs/tick never
 * sends anything twice.
 */
const MINUTE = 60_000;

const state = globalThis as unknown as { lucappScheduler?: { running: boolean } };

export function startScheduler(): void {
  // Dev hot reloads re-run instrumentation: keep a single ticker per process.
  if (state.lucappScheduler) return;
  const scheduler = { running: false };
  state.lucappScheduler = scheduler;

  const tick = async () => {
    if (scheduler.running) return; // A slow run never overlaps the next one.
    scheduler.running = true;
    try {
      const { sent } = await runMealNotifications(new Date());
      if (sent > 0) console.info(`[scheduler] ${sent} notification(s) sent`);
    } catch (error) {
      console.error("[scheduler] run failed", error);
    } finally {
      scheduler.running = false;
    }
  };

  // Start a second into the next minute, so a block that starts at 13:00 is announced at 13:00.
  setTimeout(
    () => {
      void tick();
      setInterval(() => void tick(), MINUTE).unref();
    },
    MINUTE - (Date.now() % MINUTE) + 1000,
  ).unref();
}
