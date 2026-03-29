import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    testTimeout: 30000, // 30s for API calls and DB operations
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/db/migrations/**"],
    },
  },
});
