import { tsdb, db } from "../../db/client.js";
import { candles, signals } from "../../db/schema/index.js";
import { and, eq, desc } from "drizzle-orm";
import { calculateIndicators } from "../indicators/indicator-engine.js";
import { classifyRegime } from "../regime/regime-classifier.js";
import { checkNewsGuard } from "../calendar/newsguard.js";
import { checkCorrelationLimit } from "./correlation-check.js";
import { getGatingWeights } from "../experts/gating-network.js";
import { technicalExpert } from "../experts/technical-expert.js";
import { macroExpert } from "../experts/macro-expert.js";
import { quantExpert } from "../experts/quant-expert.js";
import { htfFvgExpert } from "../experts/htf-fvg-expert.js";
import { multiTfExpert } from "../experts/multi-tf-expert.js";
import { pullbackPoiExpert } from "../experts/pullback-poi-expert.js";
import { sanityCheckExpert, applySanityCap } from "../experts/sanity-check.js";
import { runDeliberation } from "./deliberation.js";
import { calculateSignalLevels, getQualityTag } from "./tp-sl-engine.js";
import { generateNarrative } from "./narrative-generator.js";
import { cacheSet, CacheKeys } from "../../redis.js";
import { isSyntheticInstrument } from "../market-data/instruments.js";
import type { Direction } from "@apex/types";
import type { OHLCV } from "../indicators/indicator-engine.js";
import type { ExpertOutput } from "../experts/types.js";

const MIN_CANDLES = 210;
const CONFIDENCE_THRESHOLD = Number(process.env.SIGNAL_CONFIDENCE_THRESHOLD ?? 50);

export async function runSignalPipeline(
  instrument: string,
  timeframe: string,
): Promise<{ fired: boolean; reason: string }> {

  // ── 1. FETCH candles ──────────────────────────────────────────────────────
  const rows = await tsdb
    .select()
    .from(candles)
    .where(and(eq(candles.instrument, instrument), eq(candles.timeframe, timeframe)))
    .orderBy(desc(candles.time))
    .limit(250);

  if (rows.length < MIN_CANDLES) {
    return { fired: false, reason: "insufficient candle data" };
  }

  const bars: OHLCV[] = rows.reverse().map((r) => ({
    open: parseFloat(r.open), high: parseFloat(r.high),
    low: parseFloat(r.low),   close: parseFloat(r.close),
    volume: parseFloat(r.volume),
  }));

  const currentPrice = bars[bars.length - 1]!.close;

  // ── Fetch H1 bars for HTF structure analysis ─────────────────────────────
  // 80 H1 bars = ~3.3 days of entry-level context — recent leg only
  const h1Rows = await tsdb
    .select()
    .from(candles)
    .where(and(eq(candles.instrument, instrument), eq(candles.timeframe, "H1")))
    .orderBy(desc(candles.time))
    .limit(80);

  const h1Bars: OHLCV[] = h1Rows.reverse().map((r) => ({
    open: parseFloat(r.open), high: parseFloat(r.high),
    low: parseFloat(r.low),   close: parseFloat(r.close),
    volume: parseFloat(r.volume),
  }));

  // ── Fetch H4, D1, M30 bars ────────────────────────────────────────────────
  // H4:  40 bars = ~7 weeks — the recent leg of H4 price action
  // D1:  65 bars = ~3 months — "if price has been selling for 3 months" rule
  // M30: 60 bars = ~30 hours — entry-level context only
  const [h4Rows, d1Rows, m30Rows] = await Promise.all([
    tsdb.select().from(candles)
      .where(and(eq(candles.instrument, instrument), eq(candles.timeframe, "H4")))
      .orderBy(desc(candles.time)).limit(40),
    tsdb.select().from(candles)
      .where(and(eq(candles.instrument, instrument), eq(candles.timeframe, "D1")))
      .orderBy(desc(candles.time)).limit(65),
    tsdb.select().from(candles)
      .where(and(eq(candles.instrument, instrument), eq(candles.timeframe, "M30")))
      .orderBy(desc(candles.time)).limit(60),
  ]);

  const toOHLCV = (r: typeof h4Rows[number]): OHLCV => ({
    open: parseFloat(r.open), high: parseFloat(r.high),
    low: parseFloat(r.low),   close: parseFloat(r.close),
    volume: parseFloat(r.volume),
  });

  const h4Bars:  OHLCV[] = h4Rows.reverse().map(toOHLCV);
  const d1Bars:  OHLCV[] = d1Rows.reverse().map(toOHLCV);
  const m30Bars: OHLCV[] = m30Rows.reverse().map(toOHLCV);

  // ── 2-3. CALCULATE indicators ─────────────────────────────────────────────
  const indicators = calculateIndicators(bars);

  // ── 4. CLASSIFY regime ────────────────────────────────────────────────────
  const regimeResult = classifyRegime(
    instrument, timeframe,
    indicators.adx, indicators.hurst, indicators.atrRatio,
    indicators.bbBandwidth, indicators.structureScore, indicators.efficiencyRatio,
    indicators.plusDI, indicators.minusDI,
  );

  if (regimeResult.regime === "choppy") {
    return { fired: false, reason: "choppy regime — no signal" };
  }

  // ── 5. NEWSGUARD check ────────────────────────────────────────────────────
  const newsGuard = await checkNewsGuard(instrument);
  if (newsGuard.suppressed) {
    return { fired: false, reason: `NewsGuard: ${newsGuard.eventTitle}` };
  }

  // ── 8. SESSION check ──────────────────────────────────────────────────────
  if (regimeResult.sessionMultiplier === 0) {
    return { fired: false, reason: "market closed" };
  }

  // ── 9. CORRELATION check ──────────────────────────────────────────────────
  const correlation = await checkCorrelationLimit(instrument);
  if (!correlation.allowed) {
    return { fired: false, reason: `correlation limit: ${correlation.reason}` };
  }

  // ── 10. GATING weights ────────────────────────────────────────────────────
  const weights = await getGatingWeights(instrument, timeframe, regimeResult.regime);

  // ── 11. EXPERT votes (parallel) ───────────────────────────────────────────
  const quantVote = await quantExpert(instrument, timeframe, regimeResult.regime, indicators);

  const expertVotes: Record<string, ExpertOutput> = {
    technical:    technicalExpert(indicators, regimeResult.regime, currentPrice),
    macro:        macroExpert(instrument, timeframe, indicators, regimeResult.regime),
    quant:        quantVote,
    htf_fvg:      htfFvgExpert(bars, h1Bars, h4Bars),
    multi_tf:     multiTfExpert(m30Bars, h1Bars, h4Bars, d1Bars),
    pullback_poi: pullbackPoiExpert(bars, h1Bars),
  };

  // ── 12-13. CONSENSUS with sanity cap ──────────────────────────────────────
  // breakout_imminent uses lower threshold — regime itself is the primary signal
  const consensusThreshold = regimeResult.regime === "breakout_imminent" ? 40
    : regimeResult.regime === "volatile" ? 55
    : 60;

  let buyScore = 0, sellScore = 0;
  for (const [name, vote] of Object.entries(expertVotes)) {
    const w = weights[name as keyof typeof weights] ?? 0;
    if (vote.direction === "buy")  buyScore  += w * vote.confidence;
    if (vote.direction === "sell") sellScore += w * vote.confidence;
  }

  let direction: Direction;
  let rawConfidence: number;

  if (buyScore > sellScore && buyScore > consensusThreshold) {
    direction = "buy"; rawConfidence = Math.round(buyScore);
  } else if (sellScore > buyScore && sellScore > consensusThreshold) {
    direction = "sell"; rawConfidence = Math.round(sellScore);
  } else {
    return { fired: false, reason: "no consensus direction" };
  }

  const sanity = sanityCheckExpert(direction, indicators);
  const { confidence: confidenceAfterSanity, capped } = applySanityCap(
    direction, rawConfidence, sanity,
  );

  // ── 15. CONFIDENCE gate ───────────────────────────────────────────────────
  if (confidenceAfterSanity < CONFIDENCE_THRESHOLD) {
    return { fired: false, reason: `confidence ${confidenceAfterSanity} below threshold` };
  }

  // ── 16. CALCULATE levels ──────────────────────────────────────────────────
  const levels = calculateSignalLevels(
    instrument, timeframe, direction as "buy" | "sell",
    currentPrice, indicators.atr, regimeResult.regime,
  );

  if (!levels.passes) {
    return { fired: false, reason: `R:R ${levels.rrRatio} below 0.9 minimum` };
  }

  // ── 14. DELIBERATION ─────────────────────────────────────────────────────
  const deliberation = await runDeliberation({
    instrument, timeframe,
    regime: regimeResult.regime,
    direction, confidence: confidenceAfterSanity,
    indicators, expertVotes,
    rrRatio: levels.rrRatio,
    hasOpenCorrelatedSignal: false,
    consecutiveLosses: 0,
  });

  if (!deliberation.approved) {
    return { fired: false, reason: deliberation.warnings.join(", ") };
  }

  const finalConfidence = deliberation.adjustedConfidence;
  const qualityTag = getQualityTag(levels.rrRatio, finalConfidence, capped);

  // ── 19-20. NARRATIVE ──────────────────────────────────────────────────────
  const narrative = await generateNarrative(
    instrument, timeframe, direction, regimeResult.regime,
    indicators, deliberation.bullThesis, deliberation.bearThesis,
  );

  // ── 20. WRITE signal ──────────────────────────────────────────────────────
  const [inserted] = await db
    .insert(signals)
    .values({
      instrument,
      timeframe,
      direction,
      confidence: finalConfidence,
      quality_tag: qualityTag,
      regime: regimeResult.regime,
      entry_price: levels.entryPrice.toString(),
      entry_buffer: levels.entryBuffer.toString(),
      sl_price: levels.slPrice.toString(),
      tp1_price: levels.tp1Price.toString(),
      tp2_price: levels.tp2Price.toString(),
      tp3_price: levels.tp3Price?.toString() ?? null,
      atr_value: levels.atrValue.toString(),
      rr_ratio: levels.rrRatio.toString(),
      expert_votes: expertVotes,
      gating_weights: weights,
      sanity_check: sanity,
      ai_narrative: narrative,
      session: regimeResult.session,
      status: "ACTIVE",
      is_active: true,
      valid_until: levels.validUntil,
    })
    .returning();

  // ── 21. Cache active signals ──────────────────────────────────────────────
  await cacheSet(
    CacheKeys.signalsByInstrument(instrument),
    inserted,
    300,
  );

  console.log(
    `[Signal] FIRED ${instrument} ${timeframe} ${direction.toUpperCase()} conf=${finalConfidence}% RR=${levels.rrRatio} tag=${qualityTag ?? "none"}`,
  );

  return { fired: true, reason: "signal generated" };
}
