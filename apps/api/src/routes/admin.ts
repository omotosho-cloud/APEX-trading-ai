import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { signals, users, expertAccuracy } from "../db/schema/index.js";
import { desc } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";

export async function adminRoutes(server: FastifyInstance) {
  server.get("/api/admin/signals", { preHandler: requireAdmin }, async (_req, reply) => {
    const rows = await db
      .select()
      .from(signals)
      .orderBy(desc(signals.fired_at))
      .limit(500);
    return reply.send(rows);
  });

  server.get("/api/admin/users", { preHandler: requireAdmin }, async (_req, reply) => {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        full_name: users.full_name,
        subscription_status: users.subscription_status,
        subscription_end: users.subscription_end,
        created_at: users.created_at,
      })
      .from(users)
      .orderBy(desc(users.created_at))
      .limit(500);
    return reply.send(rows);
  });

  server.get("/api/admin/accuracy", { preHandler: requireAdmin }, async (_req, reply) => {
    const rows = await db
      .select()
      .from(expertAccuracy)
      .orderBy(desc(expertAccuracy.last_updated))
      .limit(500);
    return reply.send(rows);
  });
}
