import WebSocket from "ws";
import type { CandleAggregator } from "./candle-aggregator.js";
import { FOREX_INSTRUMENTS, TWELVE_DATA_SYMBOL } from "./instruments.js";

const API_KEY = process.env.TWELVE_DATA_API_KEY!;

// Twelve Data WebSocket URL with auth token
function getWebSocketUrl() {
  return `wss://ws.twelvedata.com/v1/quotes/price?apikey=${API_KEY}`;
}

export function startTwelveDataFeed(aggregator: CandleAggregator) {
  let ws: WebSocket;
  let reconnectTimer: NodeJS.Timeout;
  let heartbeatTimer: NodeJS.Timeout;

  const symbols = FOREX_INSTRUMENTS.map((i) => TWELVE_DATA_SYMBOL[i]).filter(
    Boolean,
  );

  function connect() {
    const url = getWebSocketUrl();
    ws = new WebSocket(url);

    ws.on("open", () => {
      console.log("[TwelveData] WebSocket connected");

      // Subscribe to all forex pairs
      ws.send(
        JSON.stringify({
          action: "subscribe",
          params: { symbols: symbols.join(",") },
        }),
      );

      // Heartbeat every 10s to keep connection alive
      heartbeatTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ action: "heartbeat" }));
        }
      }, 10_000);
    });

    ws.on("message", (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          event?: string;
          symbol?: string;
          price?: string;
          timestamp?: number;
        };

        if (msg.event !== "price" || !msg.symbol || !msg.price) return;

        // Convert TD symbol (EUR/USD) back to internal (EURUSD)
        const instrument = msg.symbol.replace("/", "");
        const price = parseFloat(msg.price);
        const time = msg.timestamp
          ? new Date(msg.timestamp * 1000)
          : new Date();

        aggregator.tick(instrument, price, 0, time);
      } catch {
        // malformed — ignore
      }
    });

    ws.on("close", () => {
      clearInterval(heartbeatTimer);
      console.warn("[TwelveData] WebSocket closed — reconnecting in 10s");
      reconnectTimer = setTimeout(connect, 10_000);
    });

    ws.on("error", (err) => {
      console.error("[TwelveData] WebSocket error:", err.message);
      ws.terminate();
    });
  }

  connect();

  return () => {
    clearTimeout(reconnectTimer);
    clearInterval(heartbeatTimer);
    ws?.terminate();
  };
}
