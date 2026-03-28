import WebSocket from "ws";
import type { CandleAggregator } from "./candle-aggregator.js";
import { CRYPTO_INSTRUMENTS } from "./instruments.js";

const BINANCE_WS = process.env.BINANCE_WS_URL ?? "wss://stream.binance.com:9443/ws";

// Binance stream names: btcusdt@aggTrade
const streams = CRYPTO_INSTRUMENTS.map((i) => `${i.toLowerCase()}@aggTrade`).join("/");

export function startBinanceFeed(aggregator: CandleAggregator) {
  const url = `${BINANCE_WS}/${streams}`;
  let ws: WebSocket;
  let reconnectTimer: NodeJS.Timeout;

  function connect() {
    ws = new WebSocket(url);

    ws.on("open", () => {
      console.log("[Binance] WebSocket connected");
    });

    ws.on("message", (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          s: string;   // symbol e.g. BTCUSDT
          p: string;   // price
          q: string;   // quantity
          T: number;   // trade time ms
        };

        aggregator.tick(
          msg.s,
          parseFloat(msg.p),
          parseFloat(msg.q),
          new Date(msg.T),
        );
      } catch {
        // malformed message — ignore
      }
    });

    ws.on("close", () => {
      console.warn("[Binance] WebSocket closed — reconnecting in 5s");
      reconnectTimer = setTimeout(connect, 5_000);
    });

    ws.on("error", (err) => {
      console.error("[Binance] WebSocket error:", err.message);
      ws.terminate();
    });
  }

  connect();

  return () => {
    clearTimeout(reconnectTimer);
    ws?.terminate();
  };
}
