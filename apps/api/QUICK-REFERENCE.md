# 🚀 APEX Trading AI - Quick Reference Card

## 📊 Live Data Flow at a Glance

```
Binance WS (Crypto) ─┬─► Candle Aggregator ─► TimescaleDB ─► BullMQ Queue
Twelve Data (Forex) ─┘    (H1/H4/D1)                        (Every 60s)
                                                         │
                                                         ▼
                                              Signal Pipeline (20 Steps)
                                                         │
                                                         ▼
                                              Redis Cache ─► Frontend
```

---

## 🧪 Running Tests

```bash
# Install first
pnpm install

# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Specific suites
pnpm test:e2e        # User settings + API
pnpm test:signal     # Signal generation logic
```

**Test Files:**

- `tests/e2e.test.ts` - 9 tests (User management, API endpoints)
- `tests/signal-pipeline.test.ts` - 7 tests (Regime, indicators, experts)
- `tests/live-data-flow.test.ts` - 6 tests (Architecture documentation)

---

## 📈 Key Numbers

| Metric             | Value                     |
| ------------------ | ------------------------- |
| **Data Sources**   | 2 (Binance + Twelve Data) |
| **Instruments**    | 13 (7 crypto + 6 forex)   |
| **Timeframes**     | 3 (H1, H4, D1)            |
| **Pipelines**      | 39 (13 × 3)               |
| **Analysis Steps** | 20 per pipeline           |
| **Expert Systems** | 5 AI experts              |
| **Risk Gates**     | 8 layers                  |
| **Signals/Hour**   | 0-5 (selective)           |

---

## 🎯 The 20-Step Signal Pipeline

### Data Preparation (Steps 1-3)

1. ✅ Fetch 250 recent candles
2. ✅ Calculate 15+ indicators (RSI, MACD, ADX, ATR...)
3. ✅ Calculate additional metrics

### Market Analysis (Steps 4-9)

4. **Regime Classification** - Trending vs Choppy
5. **NewsGuard** - Suppress during high-impact news
6. [Skipped in code]
7. [Skipped in code]
8. **Session Check** - London/NY active?
9. **Correlation Limit** - Max 3 correlated signals

### Expert Voting (Steps 10-13)

10. **Gating Network** - Weight experts dynamically
11. **Expert Votes** - 5 AI systems vote in parallel
12. **Consensus** - Combine weighted votes
13. **Sanity Cap** - Reduce confidence on conflicts

### Validation (Steps 14-17)

14. **AI Deliberation** - Groq LLM final review
15. **Confidence Gate** - Minimum 60%
16. **Calculate Levels** - Entry, TP, SL
17. **R:R Filter** - Minimum 1.5:1

### Execution (Steps 18-20)

18. [Skipped in code]
19. **Generate Narrative** - AI explanation
20. **Write to DB** - Store signal + cache in Redis

---

## 🛡️ Risk Management Gates

| Gate        | Threshold          | Purpose                |
| ----------- | ------------------ | ---------------------- |
| Regime      | ADX > 20           | Avoid choppy markets   |
| NewsGuard   | ±30min news        | Avoid volatility       |
| Session     | London/NY          | Ensure liquidity       |
| Correlation | Max 3              | Diversify risk         |
| Confidence  | Min 60%            | High probability       |
| Sanity Cap  | Reduce on conflict | Prevent overconfidence |
| R:R         | Min 1.5:1          | Favorable reward:risk  |
| AI Review   | LLM approval       | Final check            |

**Result:** <10% of pipeline runs fire a signal

---

## 🤖 The Five Expert Systems

```
Technical Expert      → RSI, MACD, ADX, moving averages
Smart Money Expert    → Order blocks, FVG, liquidity sweeps
Sentiment Expert      → Market positioning, contrarian signals
Macro Expert          → Economic regime, interest rates
Quant Expert          → Statistical patterns, mean reversion
```

**Dynamic Weighting:**

- Adjusts per instrument, timeframe, regime
- Based on historical accuracy + recent form
- Typical weights: 15-30% each

---

## 📡 Data Sources

### Binance WebSocket (Crypto)

- **URL:** `wss://stream.binance.com:9443/ws`
- **Pairs:** BTCUSDT, ETHUSDT, BNBUSDT, XRPUSDT, SOLUSDT, ADAUSDT, DOGEUSDT
- **Speed:** 100-1000 ticks/second
- **Type:** Real-time trades

### Twelve Data REST API (Forex)

- **URL:** `https://api.twelvedata.com/time_series`
- **Pairs:** EURUSD, GBPUSD, USDJPY, USDCHF, AUDUSD, USDCAD, NZDUSD
- **Speed:** Polled every 1-5 minutes
- **Type:** OHLCV data

---

## 🔍 Debugging Commands

```bash
# Watch live signals in logs
tail -f apps/api/logs/*.log | grep "\[Signal\]"

# Inspect Redis cache
redis-cli keys "*signals*"

# Query active signals
curl http://localhost:3001/api/signals

# Trigger manual signal generation
curl -X POST http://localhost:3001/internal/trigger-signals \
  -H "X-Cron-Secret: YOUR_SECRET"

# Check user settings
curl http://localhost:3001/api/user/settings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📁 File Structure

```
apps/api/
├── src/
│   ├── engine/
│   │   ├── market-data/
│   │   │   ├── binance-feed.ts         ← Binance WebSocket
│   │   │   ├── twelve-data-feed.ts     ← Twelve Data API
│   │   │   ├── candle-aggregator.ts    ← Builds H1/H4/D1
│   │   │   └── instruments.ts          ← Instrument list
│   │   ├── signal/
│   │   │   └── signal-pipeline.ts      ← 20-step analysis
│   │   ├── experts/
│   │   │   ├── technical-expert.ts
│   │   │   ├── smart-money-expert.ts
│   │   │   ├── sentiment-expert.ts
│   │   │   ├── macro-expert.ts
│   │   │   ├── quant-expert.ts
│   │   │   └── gating-network.ts
│   │   └── regime/
│   │       └── regime-classifier.ts
│   ├── workers/
│   │   └── signal-worker.ts            ← BullMQ queue runner
│   └── routes/
│       └── user.ts                     ← User settings API
├── tests/
│   ├── e2e.test.ts                     ← Integration tests
│   ├── signal-pipeline.test.ts         ← Unit tests
│   ├── live-data-flow.test.ts          ← Architecture docs
│   └── README.md                       ← Test guide
├── ARCHITECTURE.md                     ← Deep dive doc
└── TESTING-AND-ARCHITECTURE.md         ← Summary doc
```

---

## 🎓 Learn More

1. **Quick Start**: Read `TESTING-AND-ARCHITECTURE.md`
2. **Test Guide**: See `tests/README.md` for running tests
3. **Deep Dive**: Check `ARCHITECTURE.md` for complete flow
4. **Master Doc**: `APEX-master-prompt.md` (root) for full spec

---

## ⚡ Quick Commands Reference

```bash
# Development
pnpm dev                    # Start API server
pnpm build                  # Build for production
pnpm start                  # Run production build

# Database
pnpm db:migrate            # Run migrations
pnpm db:seed               # Seed initial data

# Testing
pnpm test                  # Run all tests
pnpm test:watch           # Watch mode
pnpm test:e2e             # E2E tests only
pnpm test:signal          # Signal tests only

# Analysis
pnpm backtest             # Run backtesting
pnpm import:historical    # Import historical data
```

---

## 🎯 Example Signal Output

```json
{
  "instrument": "EURUSD",
  "timeframe": "H4",
  "direction": "buy",
  "confidence": 78,
  "quality_tag": "A+",
  "entry_price": "1.08520",
  "sl_price": "1.08320",
  "tp1_price": "1.08720",
  "tp2_price": "1.08920",
  "tp3_price": "1.09120",
  "rr_ratio": "2.1",
  "ai_narrative": "Strong bullish confluence from technical and smart money..."
}
```

---

**Remember:** The system is designed to be **selective**. It analyzes 39 combinations every minute but typically fires only 0-5 signals per hour. This selectivity ensures high-quality setups with favorable risk-reward ratios.
