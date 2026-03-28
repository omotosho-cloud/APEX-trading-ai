import axios from "axios";

const BASE_URL = "https://api.twelvedata.com";
const API_KEY = process.env.TWELVE_DATA_API_KEY;

if (!API_KEY) throw new Error("TWELVE_DATA_API_KEY is required");

export type TwelveDataCandle = {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string | null;
};

type TimeSeriesResponse = {
  meta: { symbol: string; interval: string };
  values: TwelveDataCandle[];
  status: string;
};

// Twelve Data free tier: 800 req/day, 8 req/min
// We space requests 8s apart to stay under the per-minute limit
const RATE_LIMIT_MS = 8_000;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchTimeSeries(
  symbol: string,
  interval: string,
  outputsize: number = 5000,
  startDate?: string,
): Promise<TwelveDataCandle[]> {
  const params: Record<string, string | number> = {
    symbol,
    interval,
    outputsize,
    apikey: API_KEY!,
    format: "JSON",
    order: "ASC",
  };

  if (startDate) params["start_date"] = startDate;

  const { data } = await axios.get<TimeSeriesResponse>(`${BASE_URL}/time_series`, { params });

  if (data.status === "error") {
    throw new Error(`Twelve Data error for ${symbol} ${interval}: ${JSON.stringify(data)}`);
  }

  return data.values ?? [];
}

export { RATE_LIMIT_MS, sleep };
