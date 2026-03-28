import { EventEmitter } from "events";

export type OHLCVCandle = {
  time: Date;
  instrument: string;
  timeframe: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type PartialCandle = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  openTime: Date;
};

// Timeframe duration in minutes
const TF_MINUTES: Record<string, number> = {
  M5: 5, M15: 15, M30: 30,
  H1: 60, H4: 240, D1: 1440, W1: 10080,
};

function floorToTimeframe(date: Date, minutes: number): Date {
  const ms = minutes * 60_000;
  return new Date(Math.floor(date.getTime() / ms) * ms);
}

export class CandleAggregator extends EventEmitter {
  // key: `${instrument}:${timeframe}` → partial candle
  private partials = new Map<string, PartialCandle>();

  /**
   * Feed a price tick. Emits "candle" event when a timeframe period closes.
   */
  tick(instrument: string, price: number, volume: number, tickTime: Date) {
    for (const [tf, minutes] of Object.entries(TF_MINUTES)) {
      const key = `${instrument}:${tf}`;
      const periodStart = floorToTimeframe(tickTime, minutes);
      const existing = this.partials.get(key);

      if (!existing) {
        this.partials.set(key, {
          open: price, high: price, low: price, close: price,
          volume, openTime: periodStart,
        });
        continue;
      }

      // New period — emit completed candle, start fresh
      if (periodStart.getTime() > existing.openTime.getTime()) {
        this.emit("candle", {
          time: existing.openTime,
          instrument,
          timeframe: tf,
          open: existing.open,
          high: existing.high,
          low: existing.low,
          close: existing.close,
          volume: existing.volume,
        } satisfies OHLCVCandle);

        this.partials.set(key, {
          open: price, high: price, low: price, close: price,
          volume, openTime: periodStart,
        });
      } else {
        // Same period — update OHLCV
        existing.high = Math.max(existing.high, price);
        existing.low = Math.min(existing.low, price);
        existing.close = price;
        existing.volume += volume;
      }
    }
  }
}
