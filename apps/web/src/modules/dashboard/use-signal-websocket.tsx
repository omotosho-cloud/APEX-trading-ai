"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SIGNAL_KEY } from "@apex/lib";
import type { Signal } from "@apex/types";

const WS_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001")
  .replace("http", "ws") + "/ws";

export function useSignalWebSocket() {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setIsLive(true);

    ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const signal = JSON.parse(event.data) as Signal;
        // Update the active signals cache
        qc.setQueryData<Signal[]>([SIGNAL_KEY, "active"], (old = []) => {
          const idx = old.findIndex(
            (s) => s.instrument === signal.instrument && s.timeframe === signal.timeframe,
          );
          if (idx >= 0) {
            const updated = [...old];
            updated[idx] = signal;
            return updated;
          }
          return [signal, ...old];
        });
        // Update per-instrument cache
        qc.setQueryData<Signal[]>([SIGNAL_KEY, signal.instrument], (old = []) => {
          const idx = old.findIndex((s) => s.timeframe === signal.timeframe);
          if (idx >= 0) {
            const updated = [...old];
            updated[idx] = signal;
            return updated;
          }
          return [signal, ...old];
        });
        setLastUpdated(new Date());
      } catch {
        // malformed message
      }
    };

    ws.onclose = () => {
      setIsLive(false);
      // Reconnect after 5s
      setTimeout(connect, 5_000);
    };

    ws.onerror = () => ws.close();
  }, [qc]);

  return { connect, isLive, lastUpdated };
}
