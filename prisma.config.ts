import "dotenv/config";
import { defineConfig } from "prisma/config";

// The CLI (migrations) uses the direct connection; the app uses DATABASE_URL
// through the pg driver adapter (see src/shared/infrastructure/db.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
