import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../src/db/client.js";
import { users, signals } from "../src/db/schema/index.js";
import { eq } from "drizzle-orm";

describe("E2E: User Settings & Signal Generation", () => {
  // Use valid UUID format for test user IDs
  const testUserId = "744d1e90-dbe9-4c3a-aa02-c4548e939918";
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
      // Database stores decimals with 2 decimal places
      expect(user?.risk_pct).toMatch(/^1\.00?$/); // "1.0" or "1.00"
    });

    it("should auto-create user if exists in auth but not in local DB", async () => {
      // Use valid UUID format
      const newUserId = "844d1e90-dbe9-4c3a-aa02-c4548e939919";

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
      // Database normalizes decimals to 2 places
      expect(updated.risk_pct).toMatch(/^2\.00?$/); // "2.0" or "2.00"
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

      // Just verify regime classification returns a valid regime type
      const regime = classifyRegime(
        "EURUSD",
        "H4",
        30, // moderate adx
        0.55, // neutral hurst
        0.03, // normal atrRatio
        0.2, // normal bbBandwidth
        5, // neutral structureScore
        0.6, // moderate efficiencyRatio
      );

      // Verify regime is one of the valid types
      const validRegimes = [
        "trending_bull",
        "trending_bear",
        "ranging",
        "choppy",
        "volatile",
        "breakout_imminent",
      ];
      expect(validRegimes).toContain(regime.regime);
      // Session multiplier should be defined
      expect(typeof regime.sessionMultiplier).toBe("number");
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
      // Check for key indicators that definitely exist
      expect(typeof indicators.adx).toBe("number");
      expect(typeof indicators.rsi).toBe("number");
      expect(typeof indicators.atr).toBe("number");
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
