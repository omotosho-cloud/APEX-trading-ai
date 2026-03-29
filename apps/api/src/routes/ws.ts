import type { FastifyInstance } from "fastify";
import type { WebSocket as WS } from "ws";

const clients = new Set<WS>();

export async function wsRoute(server: FastifyInstance) {
  // Register @fastify/websocket plugin inline
  await server.register(import("@fastify/websocket"));

  server.get("/ws", { websocket: true }, (socket) => {
    clients.add(socket);
    console.log(`[WS] Client connected — total: ${clients.size}`);

    socket.on("close", () => {
      clients.delete(socket);
      console.log(`[WS] Client disconnected — total: ${clients.size}`);
    });

    socket.on("error", () => clients.delete(socket));

    // Send a ping every 30s to keep connection alive
    const ping = setInterval(() => {
      if (socket.readyState === socket.OPEN) {
        socket.ping();
      }
    }, 30_000);

    socket.on("close", () => clearInterval(ping));
  });
}

export function broadcastSignal(signal: unknown) {
  const payload = JSON.stringify(signal);
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}
