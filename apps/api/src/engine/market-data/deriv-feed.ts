import WebSocket from "ws";
import type { CandleAggregator } from "./candle-aggregator.js";
import { DERIV_SYMBOL, SYNTHETIC_INSTRUMENTS } from "./instruments.js";

// Deriv WebSocket endpoint — no API key needed for market data subscriptions,
// but you must supply your app_id. Register at https://api.deriv.com/
const DERIV_WS_URL = process.env.DERIV_WS_URL ?? "wss://ws.derivws.com/websockets/v3";
const DERIV_APP_ID = process.env.DERIV_APP_ID ?? "1089"; // 1089 = Deriv demo/test app_id

// Deriv sends tick updates; we forward each tick into the CandleAggregator
// which builds OHLCV candles for every configured timeframe.
// Deriv tick message shape (tick subscription response):
// { tick: { symbol, quote, epoch, pip_size } }

type DerivTickMsg = {
  msg_type: "tick";
  tick: {
    symbol: string;
    quote: number;
    epoch: number;   // Unix seconds
    pip_size: number;
  };
};

type DerivGenericMsg = {
  msg_type: string;
  error?: { code: string; message: string };
  [key: string]: unknown;
};

export function startDerivFeed(aggregator: CandleAggregator) {
  let ws: WebSocket;
  let reconnectTimer: NodeJS.Timeout;
  let pingTimer: NodeJS.Timeout;

  // Only subscribe to instruments that are in our active synthetic set
  const activeSymbols = SYNTHETIC_INSTRUMENTS.map((i) => DERIV_SYMBOL[i]).filter(Boolean) as string[];

  function subscribeTicks() {
    for (const symbol of activeSymbols) {
      ws.send(
        JSON.stringify({
          ticks:        symbol,
          subscribe:    1,
          passthrough: { symbol },
        }),
      );
    }
  }

  function connect() {
    const url = `${DERIV_WS_URL}?app_id=${DERIV_APP_ID}`;
    ws = new WebSocket(url);

    ws.on("open", () => {
      console.log("[Deriv] WebSocket connected");
      subscribeTicks();

      // Ping every 30s to keep the connection alive.
      // Deriv closes idle connections after ~60s.
      pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ ping: 1 }));
        }
      }, 30_000);
    });

    ws.on("message", (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString()) as DerivGenericMsg;

        // Silently ignore pong responses and subscription confirmations
        if (msg.msg_type === "pong") return;
        if (msg.msg_type === "tick_history") return;

        if (msg.error) {
          console.error(`[Deriv] API error: ${msg.error.code} — ${msg.error.message}`);
          return;
        }

        if (msg.msg_type !== "tick") return;

        const { tick } = msg as DerivTickMsg;
        if (!tick?.symbol || tick.quote == null) return;

        aggregator.tick(
          tick.symbol,
          tick.quote,
          1, // Deriv ticks don't carry volume — use 1 as tick count
          new Date(tick.epoch * 1000),
        );
      } catch {
        // Malformed message — ignore
      }
    });

    ws.on("close", (code, reason) => {
      clearInterval(pingTimer);
      console.warn(
        `[Deriv] WebSocket closed (${code}: ${reason.toString()}) — reconnecting in 5s`,
      );
      reconnectTimer = setTimeout(connect, 5_000);
    });

    ws.on("error", (err) => {
      console.error("[Deriv] WebSocket error:", err.message);
      ws.terminate();
    });
  }

  connect();

  return () => {
    clearTimeout(reconnectTimer);
    clearInterval(pingTimer);
    ws?.terminate();
  };
}
