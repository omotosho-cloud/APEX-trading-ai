import { beforeAll, afterAll } from "vitest";

// Mock environment variables for tests that don't need real DB
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test_db";
process.env.TIMESCALE_URL =
  process.env.TIMESCALE_URL ||
  "postgresql://test:test@localhost:5432/test_timescale";
process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test_jwt_secret_for_testing_purposes_only";
process.env.CRON_SECRET = process.env.CRON_SECRET || "test_cron_secret";

// Global test setup
beforeAll(async () => {
  console.log("[Test] Global setup - ensuring clean state");
});

afterAll(async () => {
  console.log("[Test] Global teardown - cleaning up");
});
