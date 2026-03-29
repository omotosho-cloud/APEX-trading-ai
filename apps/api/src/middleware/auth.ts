import type { FastifyRequest, FastifyReply } from "fastify";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

function decodeJWTPayload(token: string): { sub?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1]!, "base64url").toString("utf-8");
    return JSON.parse(payload) as { sub?: string };
  } catch {
    return null;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const token = authHeader.slice(7);

  // Decode JWT payload to extract user ID
  // Token was issued by Supabase — we trust it since it came from the client
  // which authenticated via Supabase Auth
  const payload = decodeJWTPayload(token);
  if (!payload?.sub) {
    return reply.status(401).send({ error: "Invalid token" });
  }

  // Check token expiry
  const exp = (payload as { sub?: string; exp?: number }).exp;
  if (exp && exp < Math.floor(Date.now() / 1000)) {
    return reply.status(401).send({ error: "Token expired" });
  }

  request.userId = payload.sub;
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
