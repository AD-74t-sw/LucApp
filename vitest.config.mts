import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/integration/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup-env.ts", "tests/setup-rates.ts", "tests/setup-push.ts"],
    // Integration tests share one database, so test files run one at a time.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
