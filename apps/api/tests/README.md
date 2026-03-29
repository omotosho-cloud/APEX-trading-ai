# APEX Trading AI - End-to-End Tests

## Overview

This document explains how to run tests and how the APEX system receives live market data to generate trading signals.

---

## 🧪 Running Tests

### Prerequisites

1. Install dependencies:

```bash
pnpm install
```

2. Ensure environment variables are set in `.env`:

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
TWELVE_DATA_API_KEY=your_api_key
```

### Test Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run only E2E tests
pnpm test:e2e

# Run only signal pipeline tests
pnpm test:signal

# Run with UI dashboard
pnpm vitest --ui
```

### Test Files

#### 1. **e2e.test.ts** - End-to-End Integration Tests

- User registration and settings management
- Auto-creation of users from Supabase Auth
- API endpoint health checks
- Database operations verification

**Coverage:**

- `GET /api/user/settings` - Fetch user settings
- `PATCH /api/user/settings` - Update user preferences
- `/health` - Health check endpoint
- `/api/signals` - Active signals endpoint
- `/api/plans` - Subscription plans

#### 2. **signal-pipeline.test.ts** - Signal Generation Unit Tests

- Regime classification (trending vs choppy)
- Technical indicator calculations
- NewsGuard news suppression
- Risk-reward ratio validation
- Sanity check application
- Expert voting system

**Test Cases:**

- Insufficient candle data handling
- Choppy market detection
- Trending market identification
- RSI, MACD, ADX, ATR calculations
- News event suppression
- Minimum R:R enforcement (1.5:1)
- Confidence capping on conflicts

#### 3. **live-data-flow.test.ts** - Architecture Documentation Tests

Documents how live data flows through the system:

- Binance WebSocket integration (crypto)
- Twelve Data REST API (forex)
- Candle aggregation process
- Expert system voting
- Risk management gates

---

## 📊 How Live Data Generates Signals

### Complete Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    LIVE DATA SOURCES                        │
├──────────────────────────┬──────────────────────────────────┤
│   Binance WebSocket      │   Twelve Data REST API          │
│   (Crypto: BTC, ETH...)  │   (Forex: EURUSD, GBPUSD...)    │
│   wss://stream.binance.. │   https://api.twelvedata.com    │
└──────────┬───────────────┴────────────┬─────────────────────┘
           │                            │
           ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   CANDLE AGGREGATOR                         │
│   • Accumulates real-time ticks                             │
│   • Builds H1, H4, D1 timeframes                           │
│   • Emits event on candle close                            │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   TIMESCALE DB                              │
│   • Persists OHLCV candles                                 │
│   • Queryable by instrument + timeframe                    │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              BULLMQ QUEUE (Every Minute)                    │
│   • Iterates 13 instruments × 3 timeframes = 39 pipelines  │
│   • Runs signal generation in parallel                     │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              SIGNAL PIPELINE (20 Steps)                     │
│                                                             │
│  1. Fetch 250 recent candles                               │
│  2-3. Calculate 15+ technical indicators                   │
│  4. Classify market regime (trending/choppy)               │
│  5. NewsGuard check (suppress during high-impact news)     │
│  8. Session check (London/NY active?)                      │
│  9. Correlation limit (max 3 correlated signals)           │
│  10. Gating network weights experts                        │
│  11. Five experts vote in parallel:                        │
│      • Technical Expert (RSI, MACD, ADX)                   │
│      • Smart Money Expert (Order blocks, FVG)              │
│      • Sentiment Expert (Positioning)                      │
│      • Macro Expert (Economic regime)                      │
│      • Quant Expert (Statistical patterns)                 │
│  12-13. Consensus with sanity cap                          │
│  15. Confidence gate (min 60%)                             │
│  16. Calculate TP/SL levels                                │
│  17. R:R filter (min 1.5:1)                                │
│  14. AI deliberation (Groq LLM final review)               │
│  19-20. Generate narrative                                 │
│  20. Write signal to DB                                    │
│  21. Cache in Redis                                        │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  SIGNAL DELIVERY                            │
│   • Redis cache (5 min TTL)                                │
│   • Frontend polls /api/signals                            │
│   • WebSocket push to connected clients                    │
│   • Telegram alerts (if enabled)                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Key Components

### 1. Data Sources

**Binance WebSocket** (`binance-feed.ts`)

- Real-time crypto trades via `wss://stream.binance.com:9443/ws`
- Subscribes to `@aggTrade` streams for all crypto pairs
- Processes ~100-1000 messages/second during active markets

**Twelve Data REST API** (`twelve-data-feed.ts`)

- Polled every 1-5 minutes for forex pairs
- Returns latest OHLCV data for forex instruments
- Rate-limited: 8 calls/minute on free tier

### 2. Candle Aggregation

The `CandleAggregator` class:

- Accumulates individual ticks into time-based candles
- Maintains separate H1, H4, D1 candles simultaneously
- Emits `"candle"` event when a candle period closes
- Handles multiple instruments in parallel

### 3. Signal Pipeline

Each pipeline run evaluates **20 sequential gates**:

```typescript
// Simplified flow
const result = await runSignalPipeline("EURUSD", "H4");

if (result.fired) {
  console.log(`Signal: ${result.reason}`);
} else {
  console.log(`Suppressed: ${result.reason}`);
}
```

**Common suppression reasons:**

- `"insufficient candle data"` (< 210 candles)
- `"choppy regime — no signal"` (ADX < 20)
- `"NewsGuard: High impact news"` (Economic calendar)
- `"market closed"` (Session multiplier = 0)
- `"correlation limit"` (Already 3 correlated signals)
- `"confidence 55 below threshold"` (Need 60+)
- `"R:R 1.2 below 1.5 minimum"` (Risk-reward too low)

### 4. Expert System

Five AI experts vote using weighted ensemble:

```typescript
const expertVotes = {
  technical: { direction: "buy", confidence: 75 },
  smart_money: { direction: "buy", confidence: 80 },
  sentiment: { direction: "sell", confidence: 65 }, // Contrarian
  macro: { direction: "buy", confidence: 70 },
  quant: { direction: "buy", confidence: 72 },
};

// Gating weights (dynamic per instrument/regime)
const weights = {
  technical: 0.25,
  smart_money: 0.2,
  sentiment: 0.15,
  macro: 0.2,
  quant: 0.2,
};

// Weighted score: 0.25*75 + 0.20*80 - 0.15*65 + 0.20*70 + 0.20*72 = 73.25
```

### 5. Risk Management

Multiple layers protect capital:

1. **Regime Filter**: Only trade trending markets (avoid choppy)
2. **NewsGuard**: Pause 30min before/after high-impact news
3. **Session Check**: Trade only during London/NY sessions
4. **Correlation Limit**: Max 3 signals per currency basket
5. **Confidence Threshold**: Minimum 60% confidence
6. **Sanity Cap**: Reduce confidence on indicator conflicts
7. **R:R Minimum**: Minimum 1.5:1 reward-to-risk ratio
8. **AI Deliberation**: Groq LLM final approval

---

## 📝 Example Test Output

```bash
$ pnpm test

 RUN  v1.6.0 /apps/api

 ✓ tests/e2e.test.ts (9)
   ✓ E2E: User Settings & Signal Generation (9)
     ✓ POST /api/user/register (simulated) (1)
       ✓ should create a test user in the database
     ✓ GET /api/user/settings (2)
       ✓ should return user settings for authenticated user
       ✓ should auto-create user if exists in auth but not in local DB
     ✓ PATCH /api/user/settings (1)
       ✓ should update user settings
     ✓ Signal Generation Pipeline (3)
       ✓ should have instruments configured
       ✓ should classify market regime correctly
       ✓ should calculate technical indicators
     ✓ API Endpoints Health Check (3)
       ✓ /health endpoint should respond
       ✓ /api/signals endpoint should return array
       ✓ /api/plans endpoint should return active plans

 ✓ tests/signal-pipeline.test.ts (7)
   ✓ Signal Pipeline Unit Tests (7)
     ✓ should return false when insufficient candle data
     ✓ should classify choppy market and suppress signal
     ✓ should detect trending market conditions
     ✓ should calculate all technical indicators correctly
     ✓ should apply NewsGuard suppression during high-impact news
     ✓ should calculate proper risk-reward ratios
     ✓ should apply sanity checks to prevent overconfidence

 ✓ tests/live-data-flow.test.ts (6)
   ✓ Live Data Feed Architecture (6)
     ✓ documents how Binance WebSocket feed works
     ✓ documents how Twelve Data REST API works
     ✓ explains complete data flow from source to signal
     ✓ verifies instrument configuration
     ✓ documents expert system voting architecture
     ✓ documents risk management checks

 Test Files  3 passed (3)
      Tests  22 passed (22)
   Start at  10:30:00
   Duration  5.2s
```

---

## 🚀 Debugging Tips

### 1. Watch Live Signals

```bash
# Tail server logs
tail -f apps/api/logs/*.log | grep "\[Signal\]"

# Monitor Redis cache
redis-cli MONITOR | grep "signals"
```

### 2. Manual Signal Trigger

```bash
# Trigger signal generation for all pairs
curl -X POST http://localhost:3001/internal/trigger-signals \
  -H "X-Cron-Secret: YOUR_CRON_SECRET"
```

### 3. Inspect Candle Data

```sql
-- Latest 10 EURUSD H4 candles
SELECT time, open, high, low, close, volume
FROM candles
WHERE instrument = 'EURUSD' AND timeframe = 'H4'
ORDER BY time DESC
LIMIT 10;
```

### 4. Check Active Signals

```sql
-- All active signals
SELECT instrument, timeframe, direction, confidence,
       entry_price, sl_price, tp1_price, rr_ratio
FROM signals
WHERE is_active = true
ORDER BY fired_at DESC;
```

---

## 📚 Related Files

- `src/engine/market-data/binance-feed.ts` - Binance WebSocket client
- `src/engine/market-data/twelve-data-feed.ts` - Twelve Data REST client
- `src/engine/market-data/candle-aggregator.ts` - Candle builder
- `src/engine/signal/signal-pipeline.ts` - Main signal logic (20 steps)
- `src/workers/signal-worker.ts` - BullMQ worker (runs every minute)
- `src/engine/experts/` - Five expert voting systems
- `tests/` - All test files

---

## 🎯 Next Steps

1. **Run tests regularly** during development
2. **Add new test cases** for edge cases you discover
3. **Monitor signal accuracy** via `/api/admin/accuracy` endpoint
4. **Adjust gating weights** based on performance metrics
5. **Backtest strategies** using historical data

---

**Questions?** Check the [APEX-master-prompt.md](../../APEX-master-prompt.md) for complete architecture documentation.
