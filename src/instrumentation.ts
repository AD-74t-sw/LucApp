/**
 * Runs once when a Next.js server starts. Starts the scheduler that sends
 * meal reminders, only on the Node.js runtime and not while building.
 * Set SCHEDULER=off to disable it (e.g. when an external cron calls
 * POST /api/jobs/tick instead).
 */
export async function register() {
  if (process.env["NEXT_RUNTIME"] !== "nodejs") return;
  if (process.env["NEXT_PHASE"] === "phase-production-build") return;
  if (process.env["SCHEDULER"] === "off") return;
  const { startScheduler } = await import("./scheduler");
  startScheduler();
}
