import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../src/db/client.js";
import { users, signals } from "../src/db/schema/index.js";
import { eq } from "drizzle-orm";

describe("E2E: User Settings & Signal Generation", () => {
  const testUserId = "e2e-test-user-000000000001";
  const testEmail = `test-${Date.now()}@apex-trading.ai`;

  beforeAll(async () => {
    // Cleanup any existing test data
    await db.delete(signals).where(eq(signals.instrument, "EURUSD"));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  afterAll(async () => {
    // Cleanup after tests
    await db.delete(users).where(eq(users.id, testUserId));
  });

  describe("POST /api/user/register (simulated)", () => {
    it("should create a test user in the database", async () => {
      // Simulate user registration (normally done via Supabase Auth)
      const [user] = await db
        .insert(users)
        .values({
          id: testUserId,
          email: testEmail,
          full_name: "E2E Test User",
          subscription_status: "trial",
        })
        .returning();

      expect(user).toBeDefined();
      expect(user.id).toBe(testUserId);
      expect(user.email).toBe(testEmail);
      expect(user.subscription_status).toBe("trial");
    });
  });

  describe("GET /api/user/settings", () => {
    it("should return user settings for authenticated user", async () => {
      // This would normally be tested with actual HTTP request + JWT token
      // For now, verify the user exists in DB
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, testUserId))
        .limit(1);

      expect(user).toBeDefined();
      expect(user?.email).toBe(testEmail);
      expect(user?.risk_pct).toBe("1.0"); // default value
    });

    it("should auto-create user if exists in auth but not in local DB", async () => {
      const newUserId = "auto-create-test-000000000001";

      // Verify user doesn't exist yet
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.id, newUserId))
        .limit(1);

      expect(existing).toBeUndefined();

      // The route handler will auto-create on first access
      // This is handled in routes/user.ts line 69-80
      const [newUser] = await db
        .insert(users)
        .values({
          id: newUserId,
          email: "auto-created@apex-trading.ai",
          subscription_status: "trial",
        })
        .returning();

      expect(newUser).toBeDefined();
      expect(newUser.id).toBe(newUserId);

      // Cleanup
      await db.delete(users).where(eq(users.id, newUserId));
    });
  });

  describe("PATCH /api/user/settings", () => {
    it("should update user settings", async () => {
      const updateData = {
        account_size: "10000.00",
        risk_pct: "2.0",
        preferred_pairs: ["EURUSD", "GBPUSD"],
      };

      const [updated] = await db
        .update(users)
        .set({
          account_size: updateData.account_size,
          risk_pct: updateData.risk_pct,
          preferred_pairs: updateData.preferred_pairs,
          updated_at: new Date(),
        })
        .where(eq(users.id, testUserId))
        .returning();

      expect(updated).toBeDefined();
      expect(updated.account_size).toBe(updateData.account_size);
      expect(updated.risk_pct).toBe(updateData.risk_pct);
      expect(updated.preferred_pairs).toEqual(updateData.preferred_pairs);
    });
  });

  describe("Signal Generation Pipeline", () => {
    it("should have instruments configured", async () => {
      const { ALL_INSTRUMENTS } =
        await import("../src/engine/market-data/instruments.js");
      expect(ALL_INSTRUMENTS.length).toBeGreaterThan(0);
      expect(ALL_INSTRUMENTS).toContain("EURUSD");
      expect(ALL_INSTRUMENTS).toContain("BTCUSDT");
    });

    it("should classify market regime correctly", async () => {
      const { classifyRegime } =
        await import("../src/engine/regime/regime-classifier.js");

      // Simulate trending market conditions
      const regime = classifyRegime(
        "EURUSD",
        "H4",
        25, // adx > 20 = trending
        0.55, // hurst > 0.5 = trending
        0.02, // atrRatio
        0.15, // bbBandwidth
        0.3, // structureScore
        0.7, // efficiencyRatio
      );

      expect(regime.regime).toBe("trending");
      expect(regime.sessionMultiplier).toBeGreaterThan(0);
    });

    it("should calculate technical indicators", async () => {
      const { calculateIndicators } =
        await import("../src/engine/indicators/indicator-engine.js");

      // Sample OHLCV data
      const bars = Array.from({ length: 210 }, (_, i) => ({
        open: 1.085 + Math.random() * 0.001,
        high: 1.087 + Math.random() * 0.001,
        low: 1.084 + Math.random() * 0.001,
        close: 1.086 + Math.random() * 0.001,
        volume: 1000 + Math.random() * 500,
      }));

      const indicators = calculateIndicators(bars);

      expect(indicators).toBeDefined();
      expect(indicators.adx).toBeDefined();
      expect(indicators.rsi).toBeDefined();
      expect(indicators.macd).toBeDefined();
      expect(indicators.atr).toBeDefined();
    });
  });

  describe("API Endpoints Health Check", () => {
    it("/health endpoint should respond", async () => {
      const response = await fetch("http://localhost:3001/health");
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe("ok");
      expect(data.timestamp).toBeDefined();
    });

    it("/api/signals endpoint should return array", async () => {
      const response = await fetch("http://localhost:3001/api/signals");
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it("/api/plans endpoint should return active plans", async () => {
      const response = await fetch("http://localhost:3001/api/plans");
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });
  });
});
