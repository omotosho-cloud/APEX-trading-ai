import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { userWatchlist, users, plans } from "../db/schema/index.js";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { UpdateUserSettingsSchema } from "@apex/types";

export async function userRoutes(server: FastifyInstance) {
  // GET /api/watchlist
  server.get("/api/watchlist", { preHandler: requireAuth }, async (req, reply) => {
    const rows = await db
      .select({ instrument: userWatchlist.instrument })
      .from(userWatchlist)
      .where(eq(userWatchlist.user_id, req.userId));
    return reply.send(rows.map((r) => r.instrument));
  });

  // POST /api/watchlist
  server.post<{ Body: { instrument: string } }>(
    "/api/watchlist",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { instrument } = req.body;
      await db
        .insert(userWatchlist)
        .values({ user_id: req.userId, instrument })
        .onConflictDoNothing();
      return reply.status(201).send({ ok: true });
    },
  );

  // DELETE /api/watchlist/:instrument
  server.delete<{ Params: { instrument: string } }>(
    "/api/watchlist/:instrument",
    { preHandler: requireAuth },
    async (req, reply) => {
      await db
        .delete(userWatchlist)
        .where(
          and(
            eq(userWatchlist.user_id, req.userId),
            eq(userWatchlist.instrument, req.params.instrument),
          ),
        );
      return reply.send({ ok: true });
    },
  );

  // GET /api/user/settings
  server.get("/api/user/settings", { preHandler: requireAuth }, async (req, reply) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.userId))
      .limit(1);
    if (!user) return reply.status(404).send({ error: "User not found" });
    return reply.send(user);
  });

  // PATCH /api/user/settings
  server.patch(
    "/api/user/settings",
    { preHandler: requireAuth },
    async (req, reply) => {
      const body = UpdateUserSettingsSchema.parse(req.body);
      const [updated] = await db
        .update(users)
        .set({
          ...(body.account_size !== undefined && { account_size: body.account_size?.toString() ?? null }),
          ...(body.risk_pct !== undefined && { risk_pct: body.risk_pct.toString() }),
          ...(body.preferred_pairs !== undefined && { preferred_pairs: body.preferred_pairs }),
          updated_at: new Date(),
        })
        .where(eq(users.id, req.userId))
        .returning();
      return reply.send(updated);
    },
  );

  // GET /api/plans
  server.get("/api/plans", async (_req, reply) => {
    const rows = await db
      .select()
      .from(plans)
      .where(eq(plans.is_active, true));
    return reply.send(rows);
  });
}
