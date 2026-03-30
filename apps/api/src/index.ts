import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { errorHandler } from "./middleware/error-handler.js";
import { scheduleRecurringJobs } from "./queues.js";
import { signalRoutes } from "./routes/signals.js";
import { userRoutes } from "./routes/user.js";
import { adminRoutes } from "./routes/admin.js";
import { wsRoute } from "./routes/ws.js";
import { paperTradingRoutes } from "./routes/paper-trading.js";

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === "production" ? "warn" : "info",
  },
});

async function bootstrap() {
  // CORS
  await server.register(cors, {
    origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    credentials: true,
  });

  // JWT (used for CRON_SECRET verification on internal endpoints)
  await server.register(jwt, {
    secret:
      process.env.JWT_SECRET ??
      (() => {
        throw new Error("JWT_SECRET is required");
      })(),
  });

  // Rate limiting — 100 req/min per IP
  await server.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // Global error handler
  await errorHandler(server);

  // Routes
  try {
    await server.register(signalRoutes);
    await server.register(userRoutes);
    await server.register(adminRoutes);
    await server.register(wsRoute);
    await server.register(paperTradingRoutes);
    console.log("[Routes] All routes registered");
  } catch (err) {
    console.error("[Routes] Registration failed:", err);
    throw err;
  }

  // Health check
  server.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  // Manual signal trigger for testing (CRON_SECRET protected)
  server.post(
    "/internal/trigger-signals",
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const secret = request.headers["x-cron-secret"];
      if (secret !== process.env.CRON_SECRET) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
      const { runSignalPipeline } = await import("./engine/signal/signal-pipeline.js");
      const PAIRS = ["EURUSD", "USDJPY", "USDCHF", "NZDUSD", "GBPUSD"];
      let fired = 0;
      await Promise.allSettled(
        PAIRS.map(async (inst) => {
          const r = await runSignalPipeline(inst, "H4");
          if (r.fired) fired++;
        }),
      );
      return { queued: true, fired };
    },
  );

  // Start BullMQ recurring jobs (non-fatal if Redis unavailable)
  try {
    await scheduleRecurringJobs();
  } catch (err) {
    console.error(
      "[BullMQ] Failed to schedule jobs — Redis may be unavailable:",
      err,
    );
  }

  // Start server
  const port = Number(process.env.PORT ?? 3001);
  await server.listen({ port, host: "0.0.0.0" });

  // Start workers AFTER server is listening (prevents ECONNRESET on startup)
  try {
    const { signalWorker } = await import("./workers/signal-worker.js");
    const { calendarWorker } = await import("./workers/calendar-worker.js");
    const { outcomeTrackerWorker } = await import("./workers/outcome-tracker-worker.js");
    signalWorker.on("error", (err: Error) => console.error("[SignalWorker]", err.message));
    calendarWorker.on("error", (err: Error) => console.error("[CalendarWorker]", err.message));
    outcomeTrackerWorker.on("error", (err: Error) => console.error("[OutcomeTracker]", err.message));
    console.log("[Workers] Signal + Calendar + OutcomeTracker workers started");
  } catch (err) {
    console.error("[Workers] Failed to start — Redis may be unavailable:", err);
  }

  // Start real-time market data feed (Binance WebSocket + Twelve Data API)
  try {
    const { startRealTimeFeed } = await import("./engine/market-data/feed.js");

    startRealTimeFeed();
    console.log(
      "[Feed] Real-time data feed started — Binance WebSocket + Twelve Data API",
    );
  } catch (err) {
    console.error("[Feed] Failed to start real-time feed:", err);
  }
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
