export type OHLCV = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type IndicatorResult = {
  ema20: number;
  ema50: number;
  ema200: number;
  macdLine: number;
  macdSignal: number;
  macdHistogram: number;
  rsi: number;
  stochK: number;
  stochD: number;
  adx: number;
  plusDI: number;
  minusDI: number;
  atr: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  obv: number;
  hurst: number;
  atrRatio: number;
  bbBandwidth: number;
  structureScore: number;
  rvi: number;
  efficiencyRatio: number;
};

// ─── Core math helpers ────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

// ─── EMA ─────────────────────────────────────────────────────────────────────

export function calcEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  const result: number[] = [];
  let ema = mean(prices.slice(0, period));
  result.push(ema);
  for (let i = period; i < prices.length; i++) {
    ema = prices[i]! * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

// ─── MACD ────────────────────────────────────────────────────────────────────

export function calcMACD(prices: number[]) {
  const ema12 = calcEMA(prices, 12);
  const ema26 = calcEMA(prices, 26);
  const offset = ema12.length - ema26.length;
  const macdLine = ema26.map((v, i) => (ema12[i + offset] ?? 0) - v);
  const signalLine = calcEMA(macdLine, 9);
  const sigOffset = macdLine.length - signalLine.length;
  const histogram = signalLine.map((v, i) => (macdLine[i + sigOffset] ?? 0) - v);
  return {
    macdLine: macdLine[macdLine.length - 1] ?? 0,
    macdSignal: signalLine[signalLine.length - 1] ?? 0,
    macdHistogram: histogram[histogram.length - 1] ?? 0,
  };
}

// ─── RSI ─────────────────────────────────────────────────────────────────────

export function calcRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = (prices[i] ?? 0) - (prices[i - 1] ?? 0);
    if (diff > 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < prices.length; i++) {
    const diff = (prices[i] ?? 0) - (prices[i - 1] ?? 0);
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// ─── ATR ─────────────────────────────────────────────────────────────────────

export function calcATRSeries(bars: OHLCV[], period = 14): number[] {
  if (bars.length < 2) return [];
  const trs: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const h = bars[i]!.high, l = bars[i]!.low, pc = bars[i - 1]!.close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const result: number[] = [];
  let atr = mean(trs.slice(0, period));
  result.push(atr);
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]!) / period;
    result.push(atr);
  }
  return result;
}

// ─── ADX + DI ────────────────────────────────────────────────────────────────

export function calcADX(bars: OHLCV[], period = 14) {
  if (bars.length < period * 2) return { adx: 0, plusDI: 0, minusDI: 0 };

  const plusDMs: number[] = [], minusDMs: number[] = [], trs: number[] = [];

  for (let i = 1; i < bars.length; i++) {
    const curr = bars[i]!, prev = bars[i - 1]!;
    const upMove = curr.high - prev.high;
    const downMove = prev.low - curr.low;
    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
    trs.push(Math.max(curr.high - curr.low, Math.abs(curr.high - prev.close), Math.abs(curr.low - prev.close)));
  }

  // Wilder smoothing
  function wilderSmooth(arr: number[], p: number): number[] {
    const out: number[] = [arr.slice(0, p).reduce((a, b) => a + b, 0)];
    for (let i = p; i < arr.length; i++) out.push(out[out.length - 1]! - out[out.length - 1]! / p + arr[i]!);
    return out;
  }

  const smoothTR = wilderSmooth(trs, period);
  const smoothPDM = wilderSmooth(plusDMs, period);
  const smoothMDM = wilderSmooth(minusDMs, period);

  const dxArr: number[] = [];
  for (let i = 0; i < smoothTR.length; i++) {
    const tr = smoothTR[i] ?? 1;
    const pdi = ((smoothPDM[i] ?? 0) / tr) * 100;
    const mdi = ((smoothMDM[i] ?? 0) / tr) * 100;
    const dx = Math.abs(pdi - mdi) / ((pdi + mdi) || 1) * 100;
    dxArr.push(dx);
  }

  const adxArr = wilderSmooth(dxArr, period);
  const last = adxArr.length - 1;
  const tr = smoothTR[last] ?? 1;

  return {
    adx: adxArr[last] ?? 0,
    plusDI: ((smoothPDM[last] ?? 0) / tr) * 100,
    minusDI: ((smoothMDM[last] ?? 0) / tr) * 100,
  };
}

// ─── Bollinger Bands ──────────────────────────────────────────────────────────

export function calcBollingerBands(prices: number[], period = 20, mult = 2) {
  if (prices.length < period) return { upper: 0, middle: 0, lower: 0 };
  const slice = prices.slice(-period);
  const middle = mean(slice);
  const sd = stddev(slice);
  return { upper: middle + mult * sd, middle, lower: middle - mult * sd };
}

// ─── Stochastic ───────────────────────────────────────────────────────────────

export function calcStochastic(bars: OHLCV[], kPeriod = 14, dPeriod = 3) {
  if (bars.length < kPeriod) return { stochK: 50, stochD: 50 };
  const kValues: number[] = [];
  for (let i = kPeriod - 1; i < bars.length; i++) {
    const slice = bars.slice(i - kPeriod + 1, i + 1);
    const highest = Math.max(...slice.map((b) => b.high));
    const lowest = Math.min(...slice.map((b) => b.low));
    const curr = bars[i]!.close;
    kValues.push(highest === lowest ? 50 : ((curr - lowest) / (highest - lowest)) * 100);
  }
  const stochK = kValues[kValues.length - 1] ?? 50;
  const stochD = mean(kValues.slice(-dPeriod));
  return { stochK, stochD };
}

// ─── OBV ─────────────────────────────────────────────────────────────────────

export function calcOBV(bars: OHLCV[]): number {
  let obv = 0;
  for (let i = 1; i < bars.length; i++) {
    const curr = bars[i]!, prev = bars[i - 1]!;
    if (curr.close > prev.close) obv += curr.volume;
    else if (curr.close < prev.close) obv -= curr.volume;
  }
  return obv;
}

// ─── Hurst Exponent (R/S method) ─────────────────────────────────────────────

export function calcHurst(prices: number[], rvi = 50): number {
  const maxLagBase = 100;
  const maxLag = rvi > 60 ? Math.floor(maxLagBase * 0.7) : maxLagBase;
  const minLag = 10;

  if (prices.length < maxLag + 1) return 0.5;

  const logLags: number[] = [], logTau: number[] = [];

  for (let lag = minLag; lag < maxLag; lag++) {
    const diffs: number[] = [];
    for (let i = lag; i < prices.length; i++) {
      diffs.push((prices[i] ?? 0) - (prices[i - lag] ?? 0));
    }
    const sd = stddev(diffs);
    if (sd > 0) { logLags.push(Math.log(lag)); logTau.push(Math.log(sd)); }
  }

  if (logLags.length < 2) return 0.5;

  // Linear regression slope = Hurst exponent
  const n = logLags.length;
  const sumX = logLags.reduce((a, b) => a + b, 0);
  const sumY = logTau.reduce((a, b) => a + b, 0);
  const sumXY = logLags.reduce((s, x, i) => s + x * (logTau[i] ?? 0), 0);
  const sumX2 = logLags.reduce((s, x) => s + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  return Math.max(0, Math.min(1, slope));
}

// ─── RVI (Relative Volatility Index) ─────────────────────────────────────────

export function calcRVI(bars: OHLCV[], period = 14): number {
  if (bars.length < period + 1) return 50;
  const values: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    const range = bars[i]!.high - bars[i]!.low;
    if (range > 0) values.push(((bars[i]!.close - bars[i]!.open) / range) * 100);
  }
  if (values.length === 0) return 50;
  const ema = calcEMA(values, period);
  return ema[ema.length - 1] ?? 50;
}

// ─── Efficiency Ratio (Kaufman) ───────────────────────────────────────────────

export function calcEfficiencyRatio(prices: number[], period = 10): number {
  if (prices.length < period) return 0.5;
  const slice = prices.slice(-period);
  const netChange = Math.abs(slice[slice.length - 1]! - slice[0]!);
  const sumChanges = slice.slice(1).reduce((s, v, i) => s + Math.abs(v - slice[i]!), 0);
  return sumChanges > 0 ? netChange / sumChanges : 0.5;
}

// ─── Price Structure Score ────────────────────────────────────────────────────

export function calcStructureScore(bars: OHLCV[], swingPoints = 5): number {
  if (bars.length < swingPoints * 3) return 5;

  const highs: number[] = [], lows: number[] = [];

  for (let i = swingPoints; i < bars.length - swingPoints; i++) {
    const windowHighs = bars.slice(i - swingPoints, i + swingPoints + 1).map((b) => b.high);
    const windowLows = bars.slice(i - swingPoints, i + swingPoints + 1).map((b) => b.low);
    if (bars[i]!.high === Math.max(...windowHighs)) highs.push(bars[i]!.high);
    if (bars[i]!.low === Math.min(...windowLows)) lows.push(bars[i]!.low);
  }

  if (highs.length < 2 || lows.length < 2) return 5;

  const recentHighs = highs.slice(-3);
  const recentLows = lows.slice(-3);
  const hhhl = recentHighs[recentHighs.length - 1]! > recentHighs[0]! && recentLows[recentLows.length - 1]! > recentLows[0]!;
  const lllh = recentHighs[recentHighs.length - 1]! < recentHighs[0]! && recentLows[recentLows.length - 1]! < recentLows[0]!;

  if (hhhl) return 8;
  if (lllh) return 2;
  return 5;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function calculateIndicators(bars: OHLCV[]): IndicatorResult {
  const closes = bars.map((b) => b.close);
  const atrSeries = calcATRSeries(bars);
  const currentATR = atrSeries[atrSeries.length - 1] ?? 0;
  const avgATR20 = mean(atrSeries.slice(-20)) || 1;
  const bb = calcBollingerBands(closes);
  const rvi = calcRVI(bars);
  const { adx, plusDI, minusDI } = calcADX(bars);
  const { stochK, stochD } = calcStochastic(bars);
  const { macdLine, macdSignal, macdHistogram } = calcMACD(closes);
  const ema20arr = calcEMA(closes, 20);
  const ema50arr = calcEMA(closes, 50);
  const ema200arr = calcEMA(closes, 200);

  return {
    ema20: ema20arr[ema20arr.length - 1] ?? 0,
    ema50: ema50arr[ema50arr.length - 1] ?? 0,
    ema200: ema200arr[ema200arr.length - 1] ?? 0,
    macdLine,
    macdSignal,
    macdHistogram,
    rsi: calcRSI(closes),
    stochK,
    stochD,
    adx,
    plusDI,
    minusDI,
    atr: currentATR,
    bbUpper: bb.upper,
    bbMiddle: bb.middle,
    bbLower: bb.lower,
    obv: calcOBV(bars),
    hurst: calcHurst(closes, rvi),
    atrRatio: currentATR / avgATR20,
    bbBandwidth: bb.middle > 0 ? (bb.upper - bb.lower) / bb.middle : 0,
    structureScore: calcStructureScore(bars),
    rvi,
    efficiencyRatio: calcEfficiencyRatio(closes),
  };
}
