import "dotenv/config";

// Integration tests run against a separate database so they never touch dev data.
// This runs before any test file imports the Prisma client.
const testUrl = process.env["TEST_DATABASE_URL"];
if (testUrl) {
  process.env["DATABASE_URL"] = testUrl;
  process.env["DIRECT_URL"] = testUrl;
}
process.env["SUPABASE_URL"] ??= "http://localhost:56321";
process.env["SUPABASE_PUBLISHABLE_KEY"] ??= "test-publishable-key-not-used";
process.env["APP_URL"] ??= "http://localhost:3100";
