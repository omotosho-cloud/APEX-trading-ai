import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { errorHandler } from "./middleware/error-handler.js";
import { scheduleRecurringJobs } from "./queues.js";
import "./workers/signal-worker.js";
import "./workers/calendar-worker.js";

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
    secret: process.env.JWT_SECRET ?? (() => { throw new Error("JWT_SECRET is required"); })(),
  });

  // Rate limiting — 100 req/min per IP
  await server.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // Global error handler
  await errorHandler(server);

  // Health check
  server.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  // CRON-protected internal trigger (used by scheduler to kick signal generation)
  server.post(
    "/internal/trigger-signals",
    {
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
    },
    async (request, reply) => {
      const secret = request.headers["x-cron-secret"];
      if (secret !== process.env.CRON_SECRET) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
      // Signal generation is handled by BullMQ scheduler — this is a manual trigger
      const { signalGenerationQueue } = await import("./queues.js");
      await signalGenerationQueue.add("generate-signals-manual", {});
      return { queued: true };
    },
  );

  // Start BullMQ recurring jobs
  await scheduleRecurringJobs();

  // Start server
  const port = Number(process.env.PORT ?? 3001);
  await server.listen({ port, host: "0.0.0.0" });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
