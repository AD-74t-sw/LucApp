import "dotenv/config";
import { execSync } from "node:child_process";
import { Client } from "pg";

/**
 * Creates the test database if needed and applies the migrations to it.
 * Runs once before the whole test suite.
 */
export default async function setup(): Promise<void> {
  const adminUrl = process.env["DATABASE_URL"];
  const testUrl = process.env["TEST_DATABASE_URL"];
  if (!adminUrl || !testUrl) {
    throw new Error("DATABASE_URL and TEST_DATABASE_URL must be set (see .env.example).");
  }
  const dbName = new URL(testUrl).pathname.slice(1);
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
    if (exists.rowCount === 0) await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, "")}"`);
  } finally {
    await admin.end();
  }
  execSync("pnpm exec prisma migrate deploy", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: testUrl, DIRECT_URL: testUrl },
  });
}
