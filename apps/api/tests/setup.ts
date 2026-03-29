import { beforeAll, afterAll } from "vitest";

// Global test setup
beforeAll(async () => {
  console.log("[Test] Global setup - ensuring clean state");
});

afterAll(async () => {
  console.log("[Test] Global teardown - cleaning up");
});
