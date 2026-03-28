import type { FastifyRequest, FastifyReply } from "fastify";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

// Supabase JWTs are signed with the JWT_SECRET (same as SUPABASE_JWT_SECRET)
// We verify locally to avoid network calls on every request
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET
  ?? process.env.JWT_SECRET!;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

type SupabaseJWTPayload = {
  sub: string;
  email?: string;
  role?: string;
  exp?: number;
};

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const token = authHeader.slice(7);

  try {
    // Verify JWT locally — no network call needed
    const payload = jwt.verify(token, SUPABASE_JWT_SECRET) as SupabaseJWTPayload;
    if (!payload.sub) {
      return reply.status(401).send({ error: "Invalid token" });
    }
    request.userId = payload.sub;
  } catch {
    return reply.status(401).send({ error: "Invalid or expired token" });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  if (reply.sent) return;

  const { data } = await supabaseAdmin
    .from("users")
    .select("subscription_status")
    .eq("id", request.userId)
    .single();

  if (data?.subscription_status !== "admin") {
    return reply.status(403).send({ error: "Forbidden" });
  }
}
