import type { FastifyInstance, FastifyError } from "fastify";
import { ZodError } from "zod";

export async function errorHandler(server: FastifyInstance) {
  server.setErrorHandler((error: FastifyError | ZodError | Error, _request, reply) => {
    // Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "Validation error",
        issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }

    // Fastify validation errors (schema)
    const fastifyError = error as FastifyError;
    if (fastifyError.validation) {
      return reply.status(400).send({ error: "Bad request", details: fastifyError.validation });
    }

    // Known HTTP errors
    if (fastifyError.statusCode && fastifyError.statusCode < 500) {
      return reply.status(fastifyError.statusCode).send({ error: fastifyError.message });
    }

    // Unexpected server errors
    console.error("[API Error]", error);
    return reply.status(500).send({ error: "Internal server error" });
  });
}
