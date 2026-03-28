// Twelve Data symbol format for forex: EUR/USD, for crypto: BTC/USD
export const TWELVE_DATA_SYMBOL: Record<string, string> = {
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  USDCHF: "USD/CHF",
  AUDUSD: "AUD/USD",
  USDCAD: "USD/CAD",
  NZDUSD: "NZD/USD",
  EURGBP: "EUR/GBP",
  EURJPY: "EUR/JPY",
  GBPJPY: "GBP/JPY",
  // Crypto via Twelve Data (no exchange suffix, uses USD not USDT)
  BTCUSDT: "BTC/USD",
  ETHUSDT: "ETH/USD",
  BNBUSDT: "BNB/USD",
  SOLUSDT: "SOL/USD",
  XRPUSDT: "XRP/USD",
};

// Twelve Data interval format
export const TWELVE_DATA_INTERVAL: Record<string, string> = {
  M5:  "5min",
  M15: "15min",
  M30: "30min",
  H1:  "1h",
  H4:  "4h",
  D1:  "1day",
  W1:  "1week",
};

export const FOREX_INSTRUMENTS = [
  "EURUSD","GBPUSD","USDJPY","USDCHF",
  "AUDUSD","USDCAD","NZDUSD","EURGBP","EURJPY","GBPJPY",
] as const;

export const CRYPTO_INSTRUMENTS = [
  "BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT",
] as const;

export const ALL_INSTRUMENTS = [...FOREX_INSTRUMENTS, ...CRYPTO_INSTRUMENTS] as const;
export const ALL_TIMEFRAMES = ["M5","M15","M30","H1","H4","D1","W1"] as const;
