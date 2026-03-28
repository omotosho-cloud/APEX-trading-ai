import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { signals, signalOutcomes } from "../db/schema/index.js";
import { eq, desc, and, isNotNull } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { cacheGet, cacheSet, CacheKeys } from "../redis.js";

export async function signalRoutes(server: FastifyInstance) {
  // GET /api/signals — all active signals
  server.get("/api/signals", async (_req, reply) => {
    const cached = await cacheGet(CacheKeys.activeSignals());
    if (cached) return reply.send(cached);

    const rows = await db
      .select()
      .from(signals)
      .where(eq(signals.is_active, true))
      .orderBy(desc(signals.fired_at))
      .limit(200);

    await cacheSet(CacheKeys.activeSignals(), rows, 30);
    return reply.send(rows);
  });

  // GET /api/signals/history — past signals with outcomes (auth required)
  server.get(
    "/api/signals/history",
    { preHandler: requireAuth },
    async (_req, reply) => {
      const rows = await db
        .select({
          signal: signals,
          outcome: signalOutcomes,
        })
        .from(signals)
        .leftJoin(signalOutcomes, eq(signalOutcomes.signal_id, signals.id))
        .where(eq(signals.is_active, false))
        .orderBy(desc(signals.fired_at))
        .limit(100);

      return reply.send(rows.map((r) => ({ ...r.signal, outcome: r.outcome })));
    },
  );

  // GET /api/signals/:instrument — signals for one pair, all timeframes
  server.get<{ Params: { instrument: string } }>(
    "/api/signals/:instrument",
    async (req, reply) => {
      const { instrument } = req.params;
      const cached = await cacheGet(CacheKeys.signalsByInstrument(instrument));
      if (cached) return reply.send(cached);

      const rows = await db
        .select()
        .from(signals)
        .where(
          and(
            eq(signals.instrument, instrument),
            eq(signals.is_active, true),
          ),
        )
        .orderBy(desc(signals.fired_at));

      await cacheSet(CacheKeys.signalsByInstrument(instrument), rows, 30);
      return reply.send(rows);
    },
  );
}
