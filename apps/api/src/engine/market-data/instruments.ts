// ── Twelve Data symbol mapping (forex — primary) ──────────────────────────────
export const TWELVE_DATA_SYMBOL: Record<string, string> = {
  // Major pairs
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  USDCHF: "USD/CHF",
  AUDUSD: "AUD/USD",
  USDCAD: "USD/CAD",
  NZDUSD: "NZD/USD",
  // Minor pairs (no USD)
  EURGBP: "EUR/GBP",
  EURJPY: "EUR/JPY",
  EURCHF: "EUR/CHF",
  EURAUD: "EUR/AUD",
  EURCAD: "EUR/CAD",
  GBPJPY: "GBP/JPY",
  GBPCHF: "GBP/CHF",
  GBPAUD: "GBP/AUD",
  GBPCAD: "GBP/CAD",
  AUDJPY: "AUD/JPY",
  CADJPY: "CAD/JPY",
  CHFJPY: "CHF/JPY",
  AUDNZD: "AUD/NZD",
  AUDCAD: "AUD/CAD",
  AUDCHF: "AUD/CHF",
  NZDJPY: "NZD/JPY",
  NZDCAD: "NZD/CAD",
  NZDCHF: "NZD/CHF",
  CADCHF: "CAD/CHF",
};

// ── Timeframe mappings ────────────────────────────────────────────────────────
export const TWELVE_DATA_INTERVAL: Record<string, string> = {
  M5:  "5min",
  M15: "15min",
  M30: "30min",
  H1:  "1h",
  H4:  "4h",
  D1:  "1day",
  W1:  "1week",
};

// ── Dukascopy symbol mapping (for historical import) ──────────────────────────
export const DUKASCOPY_SYMBOL: Record<string, string> = {
  EURUSD: "eurusd", GBPUSD: "gbpusd", USDJPY: "usdjpy",
  USDCHF: "usdchf", AUDUSD: "audusd", USDCAD: "usdcad",
  NZDUSD: "nzdusd", EURGBP: "eurgbp", EURJPY: "eurjpy",
  EURCHF: "eurchf", EURAUD: "euraud", EURCAD: "eurcad",
  GBPJPY: "gbpjpy", GBPCHF: "gbpchf", GBPAUD: "gbpaud",
  GBPCAD: "gbpcad", AUDJPY: "audjpy", CADJPY: "cadjpy",
  CHFJPY: "chfjpy", AUDNZD: "audnzd", AUDCAD: "audcad",
  AUDCHF: "audchf", NZDJPY: "nzdjpy", NZDCAD: "nzdcad",
  NZDCHF: "nzdchf", CADCHF: "cadchf",
};

// ── Instrument groups ─────────────────────────────────────────────────────────

// Major pairs — USD on one side, highest liquidity
export const MAJOR_PAIRS = [
  "EURUSD", "GBPUSD", "USDJPY", "USDCHF",
  "AUDUSD", "USDCAD", "NZDUSD",
] as const;

// Minor pairs — no USD, also called cross pairs
export const MINOR_PAIRS = [
  "EURGBP", "EURJPY", "EURCHF", "EURAUD", "EURCAD",
  "GBPJPY", "GBPCHF", "GBPAUD", "GBPCAD",
  "AUDJPY", "CADJPY", "CHFJPY",
  "AUDNZD", "AUDCAD", "AUDCHF",
  "NZDJPY", "NZDCAD", "NZDCHF",
  "CADCHF",
] as const;

export const FOREX_INSTRUMENTS = [...MAJOR_PAIRS, ...MINOR_PAIRS] as const;

// Crypto — kept for reference but not active in main pipeline
export const CRYPTO_INSTRUMENTS = [
  "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
] as const;

// Synthetic — kept for reference but not active in main pipeline
export const SYNTHETIC_INSTRUMENTS = [
  "R_10", "R_25", "R_50", "R_75", "R_100",
  "CRASH500", "CRASH1000", "BOOM500", "BOOM1000",
  "stpRNG",
] as const;

// Active instruments — forex only
export const ALL_INSTRUMENTS = [...FOREX_INSTRUMENTS] as const;

export const ALL_TIMEFRAMES = ["M5", "M15", "M30", "H1", "H4", "D1", "W1"] as const;

// ── Runtime helpers ───────────────────────────────────────────────────────────

export function isForexInstrument(instrument: string): boolean {
  return (FOREX_INSTRUMENTS as readonly string[]).includes(instrument);
}

export function isMajorPair(instrument: string): boolean {
  return (MAJOR_PAIRS as readonly string[]).includes(instrument);
}

export function isMinorPair(instrument: string): boolean {
  return (MINOR_PAIRS as readonly string[]).includes(instrument);
}

export function isCryptoInstrument(instrument: string): boolean {
  return (CRYPTO_INSTRUMENTS as readonly string[]).includes(instrument);
}

export function isSyntheticInstrument(instrument: string): boolean {
  return (SYNTHETIC_INSTRUMENTS as readonly string[]).includes(instrument);
}

// Which currencies does a forex pair contain?
export function getPairCurrencies(instrument: string): string[] {
  // Standard 6-char forex symbols: first 3 = base, last 3 = quote
  if (instrument.length === 6) {
    return [instrument.slice(0, 3), instrument.slice(3, 6)];
  }
  return [];
}
