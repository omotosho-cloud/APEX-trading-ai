# APEX — ADAPTIVE PREDICTIVE EXPERT SYSTEM

# FINAL PRODUCTION CODER AI MASTER PROMPT v1.0

# All decisions locked. Zero ambiguity. Build exactly this.

---

## HOW TO USE THIS PROMPT (Interactive Development)

### Session Management

This prompt is designed for **multi-session development**. You can pause and resume at any point.

**Starting Your First Session:**

1. Read through the BUILD ORDER phases below
2. Tell me which phase you want to start with (default: Phase 1)
3. I'll ask for any required environment variables or setup info
4. We build step-by-step, confirming each completion
5. When you need to stop, say "Let's pause here" — I'll note exactly where we left off

**Resuming After a Pause:**

- Say: "Continue from Step X" or "Resume Phase Y"
- I'll recap what was completed and what comes next
- We pick up exactly where we left off

### My Working Style With You

**I Will ALWAYS:**

- ✅ Ask before making assumptions about missing information
- ✅ Confirm required services exist before integrating them
- ✅ Show exactly what will be built before building it
- ✅ Wait for confirmation before proceeding to major integrations
- ✅ Remind you of checkpoint questions at the end of each phase
- ✅ Write real, working code — no mocks, no placeholders, no TODOs
- ✅ Handle every edge case, loading state, and error state
- ✅ Respect your decision to pause or change priorities

**I Will NEVER:**

- ❌ Assume API keys or service accounts exist
- ❌ Proceed without confirming you're ready
- ❌ Skip steps in the build order
- ❌ Leave you wondering what comes next
- ❌ Use paid services when a free/open-source alternative exists
- ❌ Build a feature before its dependency is confirmed working

### Before We Start — Quick Checklist

Tell me which of these you already have:

**Required for Phase 1:**

- [ ] Node.js 18+ and pnpm installed
- [ ] PostgreSQL + TimescaleDB running (Docker or cloud)
- [ ] Git repository initialized
- [ ] Supabase project created (auth + database)

**Required for Phase 2:**

- [ ] Free market data API key (Twelve Data or Alpha Vantage — both free tier)
- [ ] Redis instance (Upstash free tier)

**Required for Phase 3:**

- [ ] Qdrant vector database running (Docker — free, open source)
- [ ] Anthropic API key (Claude — for AI narrative generation)

**Required for Phase 4:**

- [ ] Paystack merchant account (Nigeria — test mode OK for development)
- [ ] SendGrid or Resend account (email alerts)

**Optional — Can Add Later:**

- [ ] Telegram Bot token (for signal alerts)
- [ ] Domain name configured
- [ ] Vercel account (for frontend deployment)
- [ ] Railway or Fly.io account (for backend deployment)

---

## ENVIRONMENT VARIABLES BY PHASE

**I will ask for these BEFORE starting each phase. Do not provide them until asked.**

### Phase 1 — Foundation

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DATABASE_URL=postgresql://user:pass@host:5432/apex_db
TIMESCALE_URL=postgresql://user:pass@host:5432/apex_timescale
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Phase 2 — Market Data Engine

```
TWELVE_DATA_API_KEY=your_twelve_data_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
BINANCE_WS_URL=wss://stream.binance.com:9443/ws
```

### Phase 3 — Signal Engine + AI

```
ANTHROPIC_API_KEY=your_anthropic_api_key
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key
SIGNAL_CONFIDENCE_THRESHOLD=60
ATR_PERIOD=14
```

### Phase 4 — Payments + Alerts

```
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@apexsignals.app
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

### Shared — All Phases

```
NODE_ENV=development
JWT_SECRET=your_jwt_secret_min_32_chars
CRON_SECRET=your_cron_secret
```

---

## PROGRESS TRACKING TEMPLATE

**Copy this at the end of each session:**

```
### APEX Build Progress

**Last Updated**: [Date]
**Current Phase**: [Phase Number]
**Last Completed Step**: [Step Number and Name]

#### Completed ✅
- [ ] Phase 1: Foundation & Auth (Steps 1–6)
- [ ] Phase 2: Market Data Engine (Steps 7–12)
- [ ] Phase 3: Signal Engine (Steps 13–20)
- [ ] Phase 4: Dashboard & UI (Steps 21–27)
- [ ] Phase 5: Payments & Alerts (Steps 28–32)
- [ ] Phase 6: Learning System (Steps 33–38)
- [ ] Phase 7: Optimisation & Launch (Steps 39–43)

#### Next Session Starts With
**Phase**: [Number]
**Step**: [Number]
**Description**: [What we'll build]

#### Pending Environment Variables
- [ ] Phase [X]: [List variables needed]

#### Notes / Blockers
[Any issues encountered or decisions made]
```

---

## ROLE

You are a senior full-stack engineer, quantitative analyst, and AI systems architect.

Build **APEX** — a production-ready, professional-grade AI trading signal platform for retail and proprietary traders.

Rules:

- Write real, working code. No mocks, no placeholders, no TODOs.
- Every screen, every state, every edge case must be handled.
- Every signal calculation must be mathematically correct — this is financial software.
- Prefer free and open-source dependencies. Never introduce a paid service when a free equivalent exists.
- If something is not specified, choose the simpler, more maintainable option and leave a comment.
- Build for Nigerian users first: Paystack payments, NGN pricing, Lagos timezone as default, mobile-first responsive design.

---

## PRODUCT SUMMARY

APEX is:

- An AI-powered trading signal platform serving retail traders and prop firm traders
- A zero-configuration signal generator — users select a pair, see buy/sell across all timeframes instantly
- A multi-agent intelligence system using Mixture-of-Experts routing and multi-timeframe regime classification
- A platform with adaptive strategy switching — the engine detects when market conditions change and adjusts automatically
- A continuously learning system — every signal outcome feeds back into expert weight adaptation
- A paid subscription product with Paystack billing (Nigeria-first)
- A signals-only platform (no broker execution at launch)
- Launching with major forex pairs + top crypto pairs
- Web-first with Telegram bot alerts
- **100% TypeScript implementation** — no Python dependencies, unified codebase, better maintainability

---

## PRODUCT DECISIONS — ALL LOCKED

| Decision       | Choice                                        | Rationale                                |
| -------------- | --------------------------------------------- | ---------------------------------------- |
| Target users   | Retail traders + prop firm traders            | Both served from day one                 |
| Signal type    | Signals only (no auto-execution)              | Regulatory simplicity, faster launch     |
| Monetisation   | Paid subscription via Paystack                | Nigeria-first billing                    |
| Primary market | Nigeria (NGN pricing, NGN display)            | Launch market                            |
| Instruments    | Major forex pairs + top 5 crypto pairs        | Manageable scope, high demand            |
| Infrastructure | Free/open-source stack (TypeScript only)      | Solo build budget constraint             |
| Platform       | Web app + Telegram bot alerts                 | Web-first, push alerts via Telegram      |
| User config    | Zero-config signals + optional lot size input | Account size → auto lot sizing           |
| Social layer   | Copy signal component (Phase 6)               | Growth mechanic, deferred                |
| AI backbone    | Claude Sonnet via Anthropic API               | Narrative generation + reasoning         |
| Vector DB      | Qdrant (self-hosted, free)                    | Open-source, fast, reliable              |
| Time-series DB | TimescaleDB (PostgreSQL extension)            | Free, production-grade                   |
| Auth           | Supabase Auth                                 | Free tier, battle-tested                 |
| Cache          | Upstash Redis (free tier)                     | Serverless Redis, free up to 10K req/day |
| Language       | TypeScript only (no Python)                   | Unified codebase, easier maintenance     |

---

## INSTRUMENT LIST — V1

### Forex Pairs (Major)

- EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, USD/CAD, NZD/USD
- EUR/GBP, EUR/JPY, GBP/JPY (cross pairs)

### Crypto Pairs

- BTC/USDT, ETH/USDT, BNB/USDT, SOL/USDT, XRP/USDT

### Timeframes Generated Per Pair

M5, M15, M30, H1, H4, D1, W1 (7 timeframes × 15 pairs = 105 signal slots)

---

## SIGNAL CARD SPECIFICATION

Every signal must display exactly this:

```
┌─────────────────────────────────────────────┐
│ EUR/USD                    [BUY]            │
│ Swing · H4                 Trending regime  │
│ ─────────────────────────────────────────── │
│ Confidence ████████████░░  74%              │
│ ─────────────────────────────────────────── │
│ Entry zone    1.08520      at market        │
│ Stop loss     1.08340      1.5× ATR         │
│ TP1 (50%)     1.08700      move SL to BE    │
│ TP2 (30%)     1.08880      R:R 1:2.0        │
│ TP3 (20%)     1.09160      runner           │
│ ─────────────────────────────────────────── │
│ Risk:Reward   1:2.0   Lot size   0.92       │
│ ─────────────────────────────────────────── │
│ Expert votes                                │
│ Technical expert    ████████████  81%       │
│ Sentiment expert    ████████░░░░  68%       │
│ Macro overlay       ███████░░░░░  62%       │
│ ─────────────────────────────────────────── │
│ AI Analysis                                 │
│ EUR/USD in confirmed uptrend. ADX 31,       │
│ Hurst 0.61. Pullback to EMA20 complete.     │
│ Targeting measured move extension.          │
└─────────────────────────────────────────────┘
```

**Lot size calculation (when user provides account size):**

```
Risk Amount = Account Size × Risk % (default 1%)
SL Distance in pips = |Entry - SL| / Pip Value
Lot Size = Risk Amount / (SL Pips × Pip Value per Lot)
```

User can adjust risk % (0.5% to 5%) via a single slider. Everything else is automatic.

---

## REGIME CLASSIFICATION ENGINE — EXACT SPECIFICATION

This is the core of APEX. Implement exactly as specified.

### The Five Pillars (calculated on every closed candle, per timeframe)

**Pillar 1 — ADX (Average Directional Index, period 14)**

```
< 20        → no trend, range/mean-reversion eligible
20–25       → transitional, apply confidence penalty -10
> 25        → trend confirmed, trend strategies eligible
> 40        → strong trend but watch exhaustion, reduce size -20%
```

**Pillar 2 — Hurst Exponent (Rescaled Range analysis, adaptive window)**

```
< 0.45      → strongly mean-reverting, fade strategies preferred
0.45–0.55   → random walk zone, confidence penalty -15
> 0.55      → trending/persistent, momentum strategies preferred
> 0.65      → strong persistence, high-conviction trend signal
```

Calculate using Rescaled Range (R/S) method with **adaptive lookback**:

```python
def hurst_exponent(prices, rvi_value, min_lag=10, max_lag_base=100):
    # Volatility-adaptive lookback window
    if rvi_value > 60:
        max_lag = int(max_lag_base * 0.7)  # Shrink by 30% when RVI > 60
    else:
        max_lag = max_lag_base

    lags = range(min_lag, max_lag)
    tau = [np.std(np.subtract(prices[lag:], prices[:-lag])) for lag in lags]
    poly = np.polyfit(np.log(lags), np.log(tau), 1)
    return poly[0]  # Hurst exponent H
```

**Pillar 3 — ATR Ratio (current ATR / 20-period average ATR)**

```
< 0.70      → compression, pre-breakout watch, BB squeeze check
0.70–1.30   → normal volatility, standard rules apply
1.30–1.80   → expanding, trend/breakout likely, widen stops
> 1.80      → extreme, news-driven — reduce size 50%, pause TP3
```

**Pillar 4 — Bollinger Band Bandwidth**

```
bandwidth = (Upper - Lower) / Middle
< 0.020     → squeeze confirmed, breakout module activates
0.020–0.060 → normal
> 0.060     → expanded, post-breakout or high volatility
```

**Pillar 5 — Price Structure Score (1–10)**

```
1–3   → flat, horizontal, no directional bias
4–6   → mixed, some direction but not clean
7–10  → clear HH/HL sequence (bull) or LL/LH sequence (bear)
```

Calculate using ZigZag pivot detection on last 20 swing points.

**Pillar 6 — Relative Volatility Index (RVI, period 14)**

```
RVI = EMA((Close - Open) / (High - Low) × 100, 14)
> 60        → high volatility regime detected, trigger adaptive lookback
< 40        → low volatility regime
40–60       → normal volatility
```

RVI triggers adaptive lookback shrinkage for Hurst Exponent calculation.

### Regime Classification Logic (priority cascade with fractal validation)

```python
def classify_regime(adx, hurst, atr_ratio, bb_bandwidth, structure_score, rvi, efficiency_ratio):
    # Priority 1: Extreme volatility overrides everything
    if atr_ratio > 1.80:
        return "volatile", min(95, 60 + int((atr_ratio - 1.8) * 30))

    # Priority 2: Bollinger squeeze = pre-breakout
    if bb_bandwidth < 0.020 and atr_ratio < 0.85 and adx < 20:
        conf = min(90, 65 + int((0.020 - bb_bandwidth) * 2000))
        return "breakout_imminent", conf

    # Priority 3: Confirmed trend with fractal validation
    if adx > 25 and structure_score >= 6:
        conf = min(92, 55 + int((adx - 25) * 1.5) + (structure_score - 6) * 4)

        # Fractal validation: Hurst + Efficiency Ratio
        if hurst > 0.55 and efficiency_ratio > 0.60:
            conf = min(95, conf + 8)  # High quality trend (H + rising ER)
        elif hurst > 0.55:
            conf = min(95, conf + 4)  # Hurst confirms
        elif hurst < 0.45:
            conf = max(50, conf - 12)  # Hurst warns against

        direction = "bull" if structure_score >= 7 else "mixed"
        return f"trending_{direction}", conf

    # Priority 4: Confirmed range
    if adx < 22 and hurst < 0.50 and structure_score <= 4:
        conf = min(90, 60 + int((22 - adx) * 1.5) + (5 - structure_score) * 4)
        return "ranging", conf

    # Default: choppy / transitional
    return "choppy", max(30, 50 - int(adx))
```

### Strategy Gates Per Regime

| Regime            | Active Strategies                         | Blocked Strategies            |
| ----------------- | ----------------------------------------- | ----------------------------- |
| trending_bull     | Trend Follow, Smart Money, Carry          | Mean Reversion, Scalp         |
| trending_bear     | Trend Follow (short), Smart Money (short) | Mean Reversion, Carry         |
| ranging           | Mean Reversion, Scalp, Range Watch        | Trend Follow, Carry           |
| breakout_imminent | Breakout/Momentum, Vol Breakout           | Mean Reversion, Scalp         |
| volatile          | Hedge, Vol Breakout (small size)          | Trend, Mean Rev, Scalp, Carry |
| choppy            | NONE — no signal issued                   | ALL                           |

### Strategy Hysteresis (CRITICAL — prevents whipsaw)

```python
HYSTERESIS_WINDOW = {
    "M5": 3,   # candles before committing regime switch
    "M15": 3,
    "M30": 4,
    "H1": 4,
    "H4": 5,
    "D1": 6,
    "W1": 8,
}

# Only commit regime change if new regime holds for N consecutive candles
def confirm_regime_switch(candle_history, new_regime, timeframe):
    window = HYSTERESIS_WINDOW[timeframe]
    recent = candle_history[-window:]
    return all(c.regime == new_regime for c in recent)
```

### Session Confidence Adjustments

Apply these multipliers to raw confidence before outputting:

```
London/NY overlap (13:00–17:00 UTC): × 1.0   (full confidence, peak liquidity)
London session (08:00–12:00 UTC):    × 0.95
New York session (13:00–17:00 UTC):  × 0.95
Tokyo session (00:00–08:00 UTC):     × 0.85  (thin forex liquidity)
Weekend / closed market:             × 0.0   (suppress all signals)
```

### Economic Calendar Blocking with NewsGuard Kill Switch

````
NewsGuard Service Integration:
  - Monitor "Red Folder" events: NFP, CPI, FOMC, GDP, Central Bank Decisions
  - 30 minutes BEFORE event:
    * Set regime_status = 'EXTREME_VOLATILITY' for affected pairs
    * Suspend ALL new signal generation
    * Flag existing active signals with "EVENT RISK" warning
  - 30 minutes AFTER event:
    * Maintain EXTREME_VOLATILITY status
    * Continue signal suppression
    * Allow liquidity to stabilize
  - Resume normal operations after 30-minute post-event window

Implementation:
```python
class NewsGuard:
    def __init__(self):
        self.red_folder_events = ['NFP', 'CPI', 'FOMC', 'GDP', 'Central Bank Decision']
        self.suppression_window_minutes = 30

    def should_suppress_signals(self, currency_pair, current_time):
        # Check for upcoming/past Red Folder events
        events = get_calendar_events(currency_pair, current_time)
        for event in events:
            if event.impact == 'high' and event.title in self.red_folder_events:
                time_diff = abs((event.event_time - current_time).total_seconds()) / 60
                if time_diff <= self.suppression_window_minutes:
                    return True, 'EXTREME_VOLATILITY'
        return False, None

# Integration in regime classifier
def classify_with_newsguard(base_regime, base_confidence, currency_pair, current_time):
    newsguard = NewsGuard()
    should_suppress, status = newsguard.should_suppress_signals(currency_pair, current_time)

    if should_suppress:
        return 'EXTREME_VOLATILITY', 0  # Override all signals

    return base_regime, base_confidence
````

Source: ForexFactory API (free) or Investing.com calendar scrape
Check on every signal generation cycle

---

## TP/SL CALCULATION ENGINE — EXACT SPECIFICATION

### ATR Multipliers by Regime

| Regime            | SL Mult | TP1 Mult | TP2 Mult | TP3 Mult |
| ----------------- | ------- | -------- | -------- | -------- |
| ranging           | 1.2×    | 1.0×     | 2.0×     | 3.0×     |
| trending          | 1.5×    | 1.5×     | 3.0×     | 5.0×     |
| breakout_imminent | 2.0×    | 2.0×     | 4.0×     | 6.5×     |
| volatile          | 2.5×    | 1.2×     | 2.0×     | DISABLED |

### Timeframe ATR Adjustment

```python
TF_MULTIPLIER = {
    "M5":  0.15,
    "M15": 0.28,
    "M30": 0.42,
    "H1":  0.55,
    "H4":  1.00,  # base reference
    "D1":  1.80,
    "W1":  3.20,
}
# Effective ATR = ATR_H4 × TF_MULTIPLIER[timeframe]
```

### Three-Target Exit Protocol with Signal Expiry

```
TP1 hit → close 50% of position → move SL to breakeven
TP2 hit → close 30% of position → trail stop at 1× ATR
TP3     → final 20% → trail stop at 0.5× ATR (runner)
SL hit  → close 100% → log outcome to signal_outcomes table
Expiry  → signal expires unfilled → log as 'EXPIRED' in signal_outcomes

Signal Lifecycle States:
  ACTIVE → FILLED → (TP1_HIT | TP2_HIT | TP3_HIT | SL_HIT | EXPIRED)
```

### Entry Buffer & Slippage Modeling Enhanced

```python
TYPICAL_SPREAD = {  # in pips
    "EURUSD": 0.1, "GBPUSD": 0.2, "USDJPY": 0.1,
    "USDCHF": 0.2, "AUDUSD": 0.2, "USDCAD": 0.3,
    "NZDUSD": 0.3, "EURGBP": 0.2, "EURJPY": 0.3,
    "GBPJPY": 0.5, "BTCUSDT": 8.0, "ETHUSDT": 0.5,
    "BNBUSDT": 0.1, "SOLUSDT": 0.05, "XRPUSDT": 0.001,
}

ENTRY_BUFFER = {  # Maximum acceptable slippage before signal expires
    "EURUSD": 5.0, "GBPUSD": 5.0, "USDJPY": 5.0,
    "USDCHF": 5.0, "AUDUSD": 5.0, "USDCAD": 5.0,
    "NZDUSD": 5.0, "EURGBP": 5.0, "EURJPY": 10.0,
    "GBPJPY": 10.0, "BTCUSDT": 50.0, "ETHUSDT": 5.0,
    "BNBUSDT": 0.5, "SOLUSDT": 0.1, "XRPUSDT": 0.001,
}

# Effective TP distance = TP distance - spread - entry_buffer
# If effective TP1 < 1.5× spread after buffer: do not fire signal (too tight)
```

### Position Sizing Formula

```python
def calculate_lot_size(account_size, risk_pct, sl_pips, instrument):
    risk_amount = account_size * (risk_pct / 100)
    pip_value = PIP_VALUE_PER_LOT[instrument]  # USD per pip per standard lot
    lot_size = risk_amount / (sl_pips * pip_value)
    return round(lot_size, 2)

PIP_VALUE_PER_LOT = {
    "EURUSD": 10.0, "GBPUSD": 10.0, "USDJPY": 9.09,
    "USDCHF": 10.0, "AUDUSD": 10.0, "USDCAD": 7.69,
    "NZDUSD": 10.0, "GBPJPY": 9.09, "EURJPY": 9.09,
    # Crypto: 1 USD per pip approximation
    "BTCUSDT": 1.0, "ETHUSDT": 1.0,
}
```

### Signal Decay & Expiry Protocol

````
Entry Buffer & Signal Expiry:
  - Every signal includes an entry_buffer (instrument-specific):
    * EUR/USD, GBP/USD, USD/JPY: 5 pips (0.0005)
    * GBP/JPY, EUR/JPY: 10 pips (0.0010)
    * BTC/USDT: $50, ETH/USDT: $5

  - Signal Status Updates:
    * ACTIVE: Current market price within entry_buffer of entry_price
    * EXPIRED: Price moved beyond entry_buffer before user interaction
    * FILLED: User accepted signal (manually or via auto-execution)

  - Hard Expiry Timestamp:
    valid_until = Current_Time + (Current_ATR × 2)
    Example: If ATR = 50 pips, signal valid for next 100 pips of movement OR 2 hours

  - Slippage-Adjusted R:R Calculation:
    * Calculate R:R using worst-case entry (entry_price ± entry_buffer)
    * If adjusted R:R < 1:1.5 → discard signal entirely
    * This ensures minimum 1:1.5 reward-to-risk even with slippage

Implementation:
```python
class SignalExpiryManager:
    ENTRY_BUFFER = {
        "EURUSD": 0.0005, "GBPUSD": 0.0005, "USDJPY": 0.0005,
        "USDCHF": 0.0005, "AUDUSD": 0.0005, "USDCAD": 0.0005,
        "NZDUSD": 0.0005, "EURGBP": 0.0005, "EURJPY": 0.0010,
        "GBPJPY": 0.0010, "BTCUSDT": 50.0, "ETHUSDT": 5.0,
        "BNBUSDT": 0.5, "SOLUSDT": 0.1, "XRPUSDT": 0.001,
    }

    def calculate_valid_until(self, current_time, current_atr, timeframe):
        """
        Hard expiry: Current_Time + (Current_ATR × 2)
        ATR in pips, convert to time based on average pip movement per hour
        """
        tf_multiplier = {
            "M5": 0.15, "M15": 0.28, "M30": 0.42,
            "H1": 0.55, "H4": 1.00, "D1": 1.80, "W1": 3.20,
        }
        effective_atr = current_atr * tf_multiplier.get(timeframe, 1.0)
        validity_hours = (effective_atr * 2) / (effective_atr / 4)  # Assume 4 hours for 1 ATR move
        return current_time + timedelta(hours=min(validity_hours, 24))  # Cap at 24h

    def check_signal_expiry(self, signal, current_price):
        """
        Check if signal has expired due to price movement
        """
        buffer = self.ENTRY_BUFFER.get(signal.instrument, 0.0005)
        price_move = abs(current_price - signal.entry_price)

        if price_move > buffer:
            return 'EXPIRED'

        # Also check time-based expiry
        if datetime.now() > signal.valid_until:
            return 'EXPIRED'

        return 'ACTIVE'

    def calculate_slippage_adjusted_rr(self, signal):
        """
        Calculate R:R using worst-case entry
        """
        buffer = self.ENTRY_BUFFER.get(signal.instrument, 0.0005)

        # Worst-case entry for BUY
        if signal.direction == 'buy':
            worst_entry = signal.entry_price + buffer
        # Worst-case entry for SELL
        else:
            worst_entry = signal.entry_price - buffer

        # Calculate distances from worst entry
        tp_distance = abs(signal.tp1_price - worst_entry)
        sl_distance = abs(signal.sl_price - worst_entry)

        adjusted_rr = tp_distance / sl_distance if sl_distance > 0 else 0

        # Discard if adjusted RR < 1:1.5
        if adjusted_rr < 1.5:
            return adjusted_rr, False  # Signal should be discarded

        return adjusted_rr, True  # Signal passes filter
````

### Correlation Circuit Breaker

````
Currency Bucket Exposure Limits:
  - Define currency buckets:
    * USD Bucket: EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, USDCAD, NZD/USD
    * EUR Bucket: EUR/USD, EUR/GBP, EUR/JPY
    * GBP Bucket: GBP/USD, EUR/GBP, GBP/JPY
    * JPY Bucket: USD/JPY, EUR/JPY, GBP/JPY
    * CRYPTO Bucket: BTC/USDT, ETH/USDT, BNB/USDT, SOL/USDT, XRP/USDT

  - Rule: Maximum 2 active signals per currency bucket
  - Before generating new signal:
    * Check active signals in same bucket
    * If count >= 2 → block new signal, log "CORRELATION_LIMIT_REACHED"

  - Purpose: Prevent overexposure to single currency risk

Implementation:
```python
class CorrelationCircuitBreaker:
    CURRENCY_BUCKETS = {
        "USD": ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD"],
        "EUR": ["EURUSD", "EURGBP", "EURJPY"],
        "GBP": ["GBPUSD", "EURGBP", "GBPJPY"],
        "JPY": ["USDJPY", "EURJPY", "GBPJPY"],
        "CRYPTO": ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"],
    }

    MAX_SIGNALS_PER_BUCKET = 2

    def get_bucket_for_instrument(self, instrument):
        """Find which bucket(s) an instrument belongs to"""
        buckets = []
        for bucket_name, instruments in self.CURRENCY_BUCKETS.items():
            if instrument in instruments:
                buckets.append(bucket_name)
        return buckets

    def can_generate_signal(self, instrument, active_signals):
        """
        Check if new signal would exceed bucket limits
        Returns: (can_proceed: bool, reason: str)
        """
        buckets = self.get_bucket_for_instrument(instrument)

        for bucket in buckets:
            bucket_signals = [
                sig for sig in active_signals
                if sig.instrument in self.CURRENCY_BUCKETS[bucket]
                and sig.is_active
            ]

            if len(bucket_signals) >= self.MAX_SIGNALS_PER_BUCKET:
                return False, f"CORRELATION_LIMIT_REACHED: {bucket} bucket already has {len(bucket_signals)} active signals"

        return True, None
````

### Minimum R:R Gate with Slippage Adjustment

```
Slippage-Adjusted R:R Calculation:
  - Use worst-case entry (entry_price ± entry_buffer)
  - Calculate R:R from worst entry point

R:R < 1.0   → signal suppressed entirely
R:R 1.0–1.5 → signal suppressed (below minimum threshold after slippage)
R:R 1.5–2.0 → signal fires normally
R:R 2.0–2.5 → signal fires with "HIGH QUALITY" tag
R:R > 2.5   → signal fires with "PREMIUM" tag

Hard Rule: If slippage-adjusted R:R falls below 1:1.5, the signal is DISCARDED entirely.
```

---

## MIXTURE-OF-EXPERTS (MOE) AGENT SPECIFICATION

### Six Expert Agents (including Sanity Check)

**Expert 1 — Technical Agent**

- Inputs: EMA 20/50/200, MACD histogram, RSI(14), Stochastic(14,3,3), ADX+DI lines, Bollinger Bands, Ichimoku Cloud, Fibonacci levels, candlestick patterns (engulfing, hammer, doji, pin bar)
- Output: direction (buy/sell/neutral), confidence (0–100)
- Weight domain: all instruments, all timeframes

**Expert 2 — Smart Money / ICT Agent**

- Inputs: Order blocks (last 10 swing highs/lows), Fair Value Gaps (FVG), liquidity levels (equal highs/lows), killzone time windows (London open, NY open, Asian session), market structure shift (MSS)
- Output: direction, confidence, nearest institutional level
- Weight domain: forex majors, H1+ timeframes only

**Expert 3 — Sentiment Agent**

- Inputs: Crypto Fear & Greed Index (free API), GDELT news sentiment (free), Reddit post volume delta (free), COT report positioning (CFTC, free weekly), funding rate for crypto (Binance free)
- Output: sentiment bias (bullish/bearish/neutral), strength (0–100)
- Weight domain: crypto higher weight, forex lower weight

**Expert 4 — Macro / Regime Agent**

- Inputs: DXY direction and momentum, 10Y US bond yield trend, risk-on/risk-off classification, economic calendar event proximity, correlation matrix (pairs vs DXY, Gold, VIX)
- Output: macro bias, risk environment (risk_on/risk_off/neutral)
- Weight domain: forex majors primary, highest weight on D1/W1

**Expert 5 — Quantitative Agent**

- Inputs: Historical win rate for this exact (instrument, regime, timeframe) combination from signal_outcomes table, expected value calculation, MAE/MFE averages from past signals, volatility percentile rank (52-week)
- Output: statistical edge score (0–100), recommended ATR multiplier adjustment
- Weight domain: all instruments, weight increases as outcome data accumulates

**Expert 6 — Sanity Check Agent (Decoupled Validator)**

- Inputs:
  - Order Flow Imbalance (if available via paid data source)
  - Higher timeframe RSI divergence (D1/W1 RSI vs current TF RSI)
  - Volume profile divergence
  - Extreme overbought/oversold conditions (RSI > 75 or < 25 on HTF)
- Output: divergence_warning (bool), distribution_signal (bullish/bearish/neutral)
- Special rule: If Technical Experts say "BUY" but Sanity Expert sees "Extreme Distribution," cap total Confidence Score at 50%
- Weight domain: all instruments, acts as a circuit breaker rather than weighted voter

### Sanity Check Implementation

```python
class SanityCheckExpert:
    def __init__(self):
        self.extreme_rsi_threshold = 75
        self.oversold_threshold = 25

    def analyze(self, instrument, current_direction, htf_data):
        """
        Decoupled from price action - validates technical consensus
        Returns: {divergence_warning: bool, distribution_signal: str}
        """
        # Higher timeframe RSI divergence check
        htf_rsi = htf_data['rsi_d1']  # Daily RSI
        current_rsi = htf_data['rsi_current']

        # Detect divergence
        if current_direction == 'buy' and htf_rsi > self.extreme_rsi_threshold:
            return {
                'divergence_warning': True,
                'distribution_signal': 'bearish',
                'reason': f'HTF RSI at {htf_rsi} (extreme overbought)'
            }

        if current_direction == 'sell' and htf_rsi < self.oversold_threshold:
            return {
                'divergence_warning': True,
                'distribution_signal': 'bullish',
                'reason': f'HTF RSI at {htf_rsi} (extreme oversold)'
            }

        # Order flow imbalance check (if data available)
        if 'order_flow_imbalance' in htf_data:
            ofi = htf_data['order_flow_imbalance']
            if current_direction == 'buy' and ofi < -0.6:  # Heavy selling pressure
                return {
                    'divergence_warning': True,
                    'distribution_signal': 'bearish',
                    'reason': 'Order flow shows heavy distribution'
                }

        return {
            'divergence_warning': False,
            'distribution_signal': 'neutral',
            'reason': 'No significant divergence detected'
        }

def apply_sanity_check(moe_consensus, sanity_output):
    """
    Cap confidence at 50% if sanity check detects divergence
    """
    direction, confidence = moe_consensus

    if sanity_output['divergence_warning']:
        if (direction == 'buy' and sanity_output['distribution_signal'] == 'bearish') or \
           (direction == 'sell' and sanity_output['distribution_signal'] == 'bullish'):
            # Cap confidence at 50%
            capped_confidence = min(confidence, 50)
            return direction, capped_confidence, 'SANITY_CAP_APPLIED'

    return direction, confidence, None
```

### Gating Network (MoE Router) with Dynamic Bench Rule

```python
def route_experts(instrument, timeframe, regime, expert_performance_cache):
    # Base weights — always active
    weights = {
        "technical":   0.35,
        "smart_money": 0.20,
        "sentiment":   0.15,
        "macro":       0.15,
        "quant":       0.15,
    }

    # Apply "Bench Rule" - dynamic weighting based on recent performance
    for expert_name in weights.keys():
        expert_stats = expert_performance_cache.get(expert_name, {})
        consecutive_losses = expert_stats.get('consecutive_losses', 0)
        last_signal_timestamp = expert_stats.get('last_signal_time', 0)

        # Benching logic: 3 consecutive SL hits → weight reduced to 0.2 for 12 hours
        if consecutive_losses >= 3:
            hours_since_last_signal = (time.time() - last_signal_timestamp) / 3600
            if hours_since_last_signal < 12:
                weights[expert_name] = 0.2  # Benched
            else:
                # Recover weight after 12h cooling-off period
                consecutive_losses = 0  # Reset counter

    # Regime adjustments
    if regime in ["trending_bull", "trending_bear"]:
        weights["technical"]   += 0.10
        weights["macro"]       += 0.05
        weights["sentiment"]   -= 0.05
        weights["smart_money"] -= 0.10
    if regime == "ranging":
        weights["technical"]   += 0.10
        weights["smart_money"] += 0.05
        weights["macro"]       -= 0.10
    if regime == "volatile":
        weights["macro"]       += 0.15
        weights["sentiment"]   += 0.10
        weights["technical"]   -= 0.15
        weights["smart_money"] -= 0.10
    # Timeframe adjustments
    if timeframe in ["M5", "M15"]:
        weights["macro"]  -= 0.10
        weights["technical"] += 0.10
    if timeframe in ["D1", "W1"]:
        weights["macro"]  += 0.10
        weights["quant"]  += 0.05
    # Crypto adjustments
    if instrument in ["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT"]:
        weights["sentiment"] += 0.10
        weights["macro"]     -= 0.05
        weights["smart_money"] -= 0.05

    # Normalise weights (excluding sanity check which is a circuit breaker)
    total = sum(weights.values())
    return {k: v / total for k, v in weights.items()}
```

### Expert Performance Tracking for Bench Rule

```python
class ExpertPerformanceTracker:
    def __init__(self):
        self.expert_stats = {}  # {expert_name: {consecutive_losses, last_signal_time, ...}}

    def update_after_signal(self, signal_id, outcome, expert_votes):
        """
        Update expert statistics after signal closes
        outcome: "tp1", "tp2", "tp3", "sl"
        """
        was_profitable = outcome in ["tp1", "tp2", "tp3"]

        for expert_name, vote in expert_votes.items():
            if expert_name not in self.expert_stats:
                self.expert_stats[expert_name] = {
                    'consecutive_losses': 0,
                    'last_signal_time': time.time(),
                    'total_signals': 0,
                    'winning_signals': 0
                }

            stats = self.expert_stats[expert_name]
            expert_was_correct = (
                (vote['direction'] == vote['consensus_direction'] and was_profitable) or
                (vote['direction'] != vote['consensus_direction'] and not was_profitable)
            )

            if not expert_was_correct:
                stats['consecutive_losses'] += 1
            else:
                stats['consecutive_losses'] = 0  # Reset on win

            stats['last_signal_time'] = time.time()
            stats['total_signals'] += 1
            if expert_was_correct:
                stats['winning_signals'] += 1

    def get_expert_state(self, expert_name):
        """Return current state for gating network"""
        return self.expert_stats.get(expert_name, {})
```

### Weighted Consensus Calculation with Sanity Cap

```python
def compute_signal(expert_outputs, weights, sanity_output):
    # Each expert returns: {"direction": "buy"/"sell"/"neutral", "confidence": 0-100}
    buy_score = 0
    sell_score = 0

    for expert, output in expert_outputs.items():
        w = weights[expert]
        if output["direction"] == "buy":
            buy_score += w * output["confidence"]
        elif output["direction"] == "sell":
            sell_score += w * output["confidence"]

    # Initial consensus
    if buy_score > sell_score and buy_score > 60:
        direction, confidence = "buy", round(buy_score)
    elif sell_score > buy_score and sell_score > 60:
        direction, confidence = "sell", round(sell_score)
    else:
        direction, confidence = "neutral", round(max(buy_score, sell_score))

    # Apply Sanity Check cap if divergence detected
    if sanity_output['divergence_warning']:
        if (direction == 'buy' and sanity_output['distribution_signal'] == 'bearish') or \
           (direction == 'sell' and sanity_output['distribution_signal'] == 'bullish'):
            confidence = min(confidence, 50)
            quality_tag = 'SANITY_CAP_APPLIED'
        else:
            quality_tag = None
    else:
        quality_tag = None

    return direction, confidence, quality_tag
```

### Expert Weight Adaptation (Learning)

After every signal closes (TP hit or SL hit), update the expert accuracy store:

```python
def update_expert_weights(signal_id, outcome):
    # outcome: "tp1", "tp2", "tp3", "sl"
    signal = get_signal(signal_id)
    was_profitable = outcome in ["tp1", "tp2", "tp3"]

    for expert in signal.expert_votes:
        expert_was_correct = (
            (expert.direction == signal.direction and was_profitable) or
            (expert.direction != signal.direction and not was_profitable)
        )
        # Rolling 50-signal accuracy window per expert per (instrument, regime, timeframe)
        update_rolling_accuracy(
            expert_name=expert.name,
            instrument=signal.instrument,
            regime=signal.regime,
            timeframe=signal.timeframe,
            correct=expert_was_correct,
            window=50
        )
    # Recompute gating weights for this (instrument, regime, timeframe) bucket
    recompute_gating_weights(signal.instrument, signal.regime, signal.timeframe)
```

---

## MULTI-AGENT DELIBERATION LAYER

After MoE produces a directional signal, route through the deliberation pipeline:

### Bull Researcher Agent

- Prompt: Given the market context, construct the strongest possible bullish case for {instrument} on {timeframe}. List supporting evidence only.
- Output: bullish_thesis (string), supporting_indicators (list), target_zones (list)

### Bear Researcher Agent

- Prompt: Given the market context, construct the strongest possible bearish case for {instrument} on {timeframe}. List risks and downside evidence only.
- Output: bearish_thesis (string), risk_factors (list), invalidation_levels (list)

### Risk Manager Agent

- Inputs: both researcher outputs + MoE consensus + account correlation data
- Checks:
  1. Is there an open correlated signal? (e.g., 3× USD short already active → reduce size)
  2. Does R:R meet minimum threshold post-spread?
  3. Is a high-impact event within 30 minutes?
  4. Has this pair had 3 consecutive losing signals? (reduce confidence -10)
- Output: approved (bool), adjusted_confidence, size_multiplier, warnings (list)

### Fund Manager Agent (Final Approver)

- Inputs: all researcher outputs + risk manager decision
- Logic:
  - If risk manager rejects → signal suppressed, reason logged
  - If confidence < 60 → no signal
  - If confidence 60–69 → signal with "LOW CONFIDENCE" tag
  - If confidence 70–79 → standard signal
  - If confidence ≥ 80 → signal with "HIGH QUALITY" tag
- Output: final signal object → write to signals table → push to WebSocket

---

## DATABASE SCHEMA — COMPLETE

### TimescaleDB Tables (time-series, high write volume)

```sql
-- Raw OHLCV candle data (hypertable — partitioned by time)
CREATE TABLE candles (
    time        TIMESTAMPTZ NOT NULL,
    instrument  VARCHAR(12) NOT NULL,
    timeframe   VARCHAR(4) NOT NULL,
    open        DECIMAL(18,8) NOT NULL,
    high        DECIMAL(18,8) NOT NULL,
    low         DECIMAL(18,8) NOT NULL,
    close       DECIMAL(18,8) NOT NULL,
    volume      DECIMAL(18,8) NOT NULL,
    PRIMARY KEY (time, instrument, timeframe)
);
SELECT create_hypertable('candles', 'time');
CREATE INDEX ON candles (instrument, timeframe, time DESC);

-- Pre-computed regime states (updated on each candle close)
CREATE TABLE regime_states (
    time            TIMESTAMPTZ NOT NULL,
    instrument      VARCHAR(12) NOT NULL,
    timeframe       VARCHAR(4) NOT NULL,
    regime          VARCHAR(32) NOT NULL,
    confidence      SMALLINT NOT NULL,
    adx             DECIMAL(6,2),
    hurst           DECIMAL(4,3),
    atr_ratio       DECIMAL(6,3),
    bb_bandwidth    DECIMAL(8,5),
    structure_score SMALLINT,
    PRIMARY KEY (time, instrument, timeframe)
);
SELECT create_hypertable('regime_states', 'time');
```

### PostgreSQL Tables (relational)

```sql
-- Users and subscriptions
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    full_name       TEXT,
    account_size    DECIMAL(12,2),
    risk_pct        DECIMAL(4,2) DEFAULT 1.0,
    preferred_pairs TEXT[] DEFAULT '{}',
    subscription_status TEXT DEFAULT 'trial', -- trial, active, expired
    subscription_end    TIMESTAMPTZ,
    telegram_chat_id    BIGINT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription plans
CREATE TABLE plans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,         -- 'starter', 'pro', 'elite'
    price_ngn   INTEGER NOT NULL,      -- price in Kobo (Paystack)
    interval    TEXT NOT NULL,         -- 'monthly', 'quarterly', 'yearly'
    features    JSONB NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE
);

-- Payment records
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    plan_id         UUID REFERENCES plans(id),
    paystack_ref    TEXT UNIQUE,
    amount_kobo     INTEGER NOT NULL,
    status          TEXT DEFAULT 'pending', -- pending, success, failed
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Generated signals (master table) with expiry tracking
CREATE TABLE signals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument      VARCHAR(12) NOT NULL,
    timeframe       VARCHAR(4) NOT NULL,
    direction       VARCHAR(8) NOT NULL,  -- buy, sell, neutral
    confidence      SMALLINT NOT NULL,
    quality_tag     TEXT,                 -- HIGH_QUALITY, LOW_CONFIDENCE, EVENT_RISK, SANITY_CAP_APPLIED, PREMIUM
    regime          VARCHAR(32) NOT NULL,
    entry_price     DECIMAL(18,8) NOT NULL,
    entry_buffer    DECIMAL(18,8) NOT NULL,  -- allowed slippage before expiry
    sl_price        DECIMAL(18,8) NOT NULL,
    tp1_price       DECIMAL(18,8) NOT NULL,
    tp2_price       DECIMAL(18,8) NOT NULL,
    tp3_price       DECIMAL(18,8),
    atr_value       DECIMAL(18,8) NOT NULL,
    rr_ratio        DECIMAL(4,2) NOT NULL,  -- slippage-adjusted R:R
    expert_votes    JSONB NOT NULL,       -- {technical: {dir, conf}, ...}
    gating_weights  JSONB NOT NULL,
    sanity_check    JSONB,                -- {divergence_warning: bool, distribution_signal: str, reason: str}
    ai_narrative    TEXT,
    session         TEXT,                -- london, ny, tokyo, overlap
    status          VARCHAR(16) DEFAULT 'ACTIVE',  -- ACTIVE, EXPIRED, FILLED
    is_active       BOOLEAN DEFAULT TRUE,
    fired_at        TIMESTAMPTZ DEFAULT NOW(),
    valid_until     TIMESTAMPTZ NOT NULL,  -- hard expiry timestamp
    filled_at       TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ
);
CREATE INDEX ON signals (instrument, timeframe, fired_at DESC);
CREATE INDEX ON signals (is_active, fired_at DESC);
CREATE INDEX ON signals (status, valid_until);

-- Signal outcome tracking (the learning foundation) with expiry tracking
CREATE TABLE signal_outcomes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id       UUID REFERENCES signals(id),
    outcome         TEXT NOT NULL,      -- tp1, tp2, tp3, sl, expired
    exit_price      DECIMAL(18,8),
    pips_gained     DECIMAL(8,2),
    rr_achieved     DECIMAL(4,2),
    duration_mins   INTEGER,
    -- Market context at signal time (for regime RAG)
    regime_snapshot JSONB NOT NULL,
    -- Expiry tracking
    expiry_reason   TEXT,               -- 'PRICE_MOVE_BEYOND_BUFFER', 'TIME_EXPIRED', 'USER_CANCELLED'
    slippage_pips   DECIMAL(8,2),       -- actual slippage experienced vs entry_price
    closed_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Expert rolling accuracy (updated after each signal closes)
CREATE TABLE expert_accuracy (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_name     TEXT NOT NULL,
    instrument      VARCHAR(12) NOT NULL,
    timeframe       VARCHAR(4) NOT NULL,
    regime          VARCHAR(32) NOT NULL,
    window_size     SMALLINT DEFAULT 50,
    correct_count   SMALLINT DEFAULT 0,
    total_count     SMALLINT DEFAULT 0,
    accuracy_pct    DECIMAL(5,2),
    last_updated    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (expert_name, instrument, timeframe, regime)
);

-- Watchlist — pairs each user is watching
CREATE TABLE user_watchlist (
    user_id     UUID REFERENCES users(id),
    instrument  VARCHAR(12) NOT NULL,
    added_at    TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, instrument)
);

-- Copy signal subscriptions (Phase 6)
CREATE TABLE copy_subscriptions (
    follower_id     UUID REFERENCES users(id),
    leader_id       UUID REFERENCES users(id),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (follower_id, leader_id)
);

-- Economic calendar events cache
CREATE TABLE calendar_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_time  TIMESTAMPTZ NOT NULL,
    currency    VARCHAR(4) NOT NULL,
    impact      TEXT NOT NULL,  -- low, medium, high
    title       TEXT NOT NULL,
    forecast    TEXT,
    previous    TEXT,
    fetched_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON calendar_events (event_time, impact);
```

### Qdrant Collections (vector memory)

```
Collection: regime_fingerprints
  Vector: 128-dim embedding of [adx, hurst, atr_ratio, bb_bandwidth, structure_score,
          session_hour, day_of_week, volatility_percentile, ...normalised features]
  Payload: {instrument, timeframe, regime, outcome, rr_achieved, fired_at}
  Purpose: "Find me 10 historical setups most similar to this current regime state"
  Query result: bias the signal confidence based on historical outcome rates

Collection: news_sentiment
  Vector: sentence embedding of news headlines
  Payload: {headline, source, currency_pair, sentiment_score, published_at}
  Purpose: RAG retrieval for AI narrative generation
```

---

## SIGNAL GENERATION PIPELINE — EXACT FLOW (VOLATILITY-ADAPTIVE)

```
Every M5 candle close (triggered by cron or WebSocket event):

1. FETCH — get latest OHLCV for all instruments × all timeframes from TimescaleDB
2. CALCULATE — run all technical indicators (EMA, MACD, RSI, ATR, BB, ADX, Hurst, Structure, RVI, Efficiency Ratio)
3. CALCULATE RVI — determine if adaptive lookback needed (RVI > 60 → shrink Hurst window by 30%)
4. CLASSIFY — run regime classifier per (instrument × timeframe) with fractal validation (H + ER)
5. NEWSGUARD CHECK — check for Red Folder events within 30min window → set EXTREME_VOLATILITY if detected
6. HYSTERESIS CHECK — confirm regime is stable (N candles) before proceeding
7. CALENDAR CHECK — suppress if high-impact event within 30min (redundant with NewsGuard but kept for safety)
8. SESSION CHECK — apply session confidence multiplier
9. CORRELATION CHECK — verify bucket limits not exceeded (max 2 signals per currency bucket)
10. ROUTE — gating network selects expert weights for this (instrument, regime, timeframe) including bench rule application
11. EXPERT VOTES — run 6 expert agents in parallel (Technical, Smart Money, Sentiment, Macro, Quant, Sanity Check)
12. SANITY CHECK — apply divergence cap if Sanity Expert flags extreme overbought/oversold
13. CONSENSUS — weighted vote → direction + confidence (capped at 50% if sanity divergence)
14. DELIBERATION — Bull researcher → Bear researcher → Risk manager → Fund manager
15. GATE — if confidence < 60 or R:R < 1.5 (slippage-adjusted) → suppress
16. CALCULATE LEVELS — entry, SL, TP1/2/3 using ATR multipliers + spread model + entry buffer
17. CALCULATE EXPIRY — valid_until = Current_Time + (ATR × 2), entry_buffer applied
18. SLIPPAGE-ADJUSTED RR — verify R:R >= 1.5 using worst-case entry → discard if fails
19. GENERATE NARRATIVE — Claude Sonnet API call with market context
20. WRITE — insert to signals table with status='ACTIVE', valid_until, entry_buffer
21. PUSH — WebSocket broadcast to connected dashboard clients
22. ALERT — Telegram bot message to subscribed users
23. REGIME RAG — store regime fingerprint in Qdrant
24. MONITOR — continuous price monitoring for signal expiry (price moves beyond entry_buffer)
```

---

## FRONTEND SPECIFICATION

### Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (free, open-source)
- **Charts**: Recharts (free)
- **State**: Zustand + React Query
- **Real-time**: native WebSocket (no paid service)
- **Auth**: Supabase Auth (Next.js middleware)

### Pages

```
/                       → Landing page (marketing)
/login                  → Login page
/register               → Register page
/dashboard              → Main signal dashboard (protected)
/dashboard/[instrument] → Single pair signal detail
/dashboard/watchlist    → User watchlist
/dashboard/history      → Signal history + outcomes
/dashboard/settings     → Account size, risk %, Telegram setup
/admin                  → Admin panel (role-gated)
/admin/signals          → All signals + accuracy stats
/admin/users            → User management + subscriptions
/admin/accuracy         → Expert accuracy dashboard
/pricing                → Plans page
/about                  → About APEX
```

### Dashboard Layout (Zero Config)

```
┌─────────────────────────────────────────────────────┐
│ APEX  [● Live]                    [Settings] [User] │
├──────────────┬──────────────────────────────────────┤
│ FOREX        │  EUR/USD  · Swing · H4               │
│ EUR/USD  BUY │  ─────────────────────────────────── │
│ GBP/USD SELL │  [Signal Card — full detail]         │
│ USD/JPY  BUY │                                      │
│ USD/CHF  ─── │  Timeframe strip:                    │
│ AUD/USD SELL │  M5  [BUY  61%] ████████             │
│ USD/CAD  BUY │  M15 [BUY  68%] ██████████           │
│ NZD/USD  ─── │  M30 [NEU  52%] ███████              │
│ EUR/GBP  ─── │  H1  [BUY  72%] ███████████          │
│ EUR/JPY  BUY │  H4  [BUY  74%] ████████████ ← open │
│ GBP/JPY  BUY │  D1  [BUY  71%] ████████████        │
│              │  W1  [NEU  55%] ████████             │
│ CRYPTO       │                                      │
│ BTC/USD  BUY │  [Full signal card detail below]     │
│ ETH/USD  BUY │                                      │
│ BNB/USD  ─── │                                      │
│ SOL/USD SELL │                                      │
│ XRP/USD  BUY │                                      │
└──────────────┴──────────────────────────────────────┘
```

### Pair Tile Design

Each pair tile shows:

- Symbol (EUR/USD)
- Overall bias (BUY/SELL/─── for neutral)
- 7 coloured dots = M5→W1 signals (green=buy, red=sell, grey=neutral)

Clicking any pair:

- Updates the right panel with timeframe strip
- Clicking a timeframe row shows full signal card

### Real-time Updates

- WebSocket connection maintained on dashboard
- Signal updates push to all connected clients
- "Live · updated Xs ago" indicator
- No page refresh required

---

## BACKEND SPECIFICATION

### Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Fastify (faster than Express, native TypeScript)
- **Job Queue**: BullMQ + Redis (open-source)
- **Signal Engine**: Python service (NumPy, Pandas, TA-Lib — all free)
- **AI Orchestration**: Mastra (TypeScript — free, open-source)
- **Workflow Automation**: n8n (self-hosted Docker — free)
- **ORM**: Drizzle ORM (TypeScript, fast, free)
- **Validation**: Zod

### Service Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Next.js Frontend                   │
│              (Vercel deployment — free tier)         │
└─────────────────┬────────────────────────────────────┘
                  │ REST + WebSocket
┌─────────────────▼────────────────────────────────────┐
│              Fastify API Server (TypeScript)         │
│         (Railway or Fly.io — ~$5/month)              │
│  /api/signals  /api/auth  /api/payments  /api/ws    │
└──────┬──────────────┬──────────────┬─────────────────┘
       │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌───▼──────────────────┐
│  BullMQ     │ │ TypeScript │ │   Mastra Agent       │
│  Job Queue  │ │  Signal    │ │   Orchestrator       │
│  (Redis)    │ │  Engine    │ │   (AI layer)         │
│             │ │  (ta-lib)  │ │                      │
└──────┬──────┘ └─────┬──────┘ └───┬──────────────────┘
       │              │             │
┌──────▼──────────────▼─────────────▼──────────────────┐
│  TimescaleDB  │  PostgreSQL  │  Qdrant  │  Redis      │
│  (candles)    │  (app data)  │ (vectors)│  (cache)    │
└───────────────────────────────────────────────────────┘
```

### API Routes

```
POST   /api/auth/register          → create user
POST   /api/auth/login             → Supabase auth
POST   /api/auth/logout
GET    /api/signals                → all active signals (paginated)
GET    /api/signals/:instrument    → signals for one pair, all TFs
GET    /api/signals/:instrument/:tf → single signal with full detail
GET    /api/signals/history        → past signals + outcomes (auth)
POST   /api/watchlist              → add pair to watchlist
DELETE /api/watchlist/:instrument  → remove from watchlist
GET    /api/watchlist              → get user watchlist
POST   /api/payments/initialize    → create Paystack transaction
POST   /api/payments/webhook       → Paystack webhook (verify + activate)
GET    /api/plans                  → list subscription plans
GET    /api/user/settings          → get user settings
PATCH  /api/user/settings          → update account_size, risk_pct
POST   /api/user/telegram          → link Telegram chat ID
GET    /api/admin/accuracy         → expert accuracy stats (admin only)
GET    /api/admin/signals          → all signals with outcomes (admin only)
GET    /ws                         → WebSocket endpoint for live signals
```

### BullMQ Job Queues

```
Queue: signal-generation
  Job: generate-signals
  Schedule: every 5 minutes (cron: */5 * * * *)
  Processor: run full signal pipeline for all instruments

Queue: calendar-sync
  Job: fetch-calendar
  Schedule: every 1 hour
  Processor: fetch ForexFactory events, update calendar_events table

Queue: outcome-tracker
  Job: check-signal-outcomes
  Schedule: every 5 minutes
  Processor: check if active signals hit TP or SL, update signal_outcomes

Queue: expert-adaptation
  Job: update-expert-weights
  Trigger: after every outcome-tracker job completes
  Processor: recompute expert_accuracy table, update gating weights cache

Queue: telegram-alerts
  Job: send-telegram-signal
  Trigger: after new signal written (confidence > 70 only)
  Processor: send formatted signal message to subscribed users
```

---

## PYTHON SIGNAL ENGINE — EXACT SPECIFICATION

The Python service runs as a separate process, called by the Node.js backend via HTTP or message queue.

### Libraries (all free/open-source)

```
pandas, numpy, ta-lib, scipy, sklearn, qdrant-client, psycopg2, redis
```

### Indicator Calculations

```typescript
// packages/store/modules/signal-engine/indicator-engine.ts
import TA from "talib";
import { Matrix } from "mathjs";
import { linearRegression } from "simple-statistics";

export interface IndicatorResult {
  // Trend
  ema20: number[];
  ema50: number[];
  ema200: number[];
  macd: { macd: number[]; signal: number[]; histogram: number[] };
  adx: number[];
  plusDI: number[];
  minusDI: number[];

  // Momentum
  rsi: number[];
  stoch: { k: number[]; d: number[] };
  cci: number[];
  williams: number[];

  // Volatility
  atr: number[];
  bollingerBands: { upper: number[]; middle: number[]; lower: number[] };

  // Volume
  obv: number[];
  cmf: number[];

  // Custom calculations
  hurst: number;
  atrRatio: number;
  bbBandwidth: number;
  structureScore: number;
  rvi: number; // Relative Volatility Index
  efficiencyRatio: number;
}

export class IndicatorEngine {
  /**
   * Calculate all technical indicators for OHLCV data
   * Pure TypeScript implementation — no Python needed
   */
  calculateAll(
    ohlcv: Array<{
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }>,
  ): IndicatorResult {
    const close = ohlcv.map((c) => c.close);
    const high = ohlcv.map((c) => c.high);
    const low = ohlcv.map((c) => c.low);
    const volume = ohlcv.map((c) => c.volume);

    return {
      // Trend Indicators
      ema20: this.calculateEMA(close, 20),
      ema50: this.calculateEMA(close, 50),
      ema200: this.calculateEMA(close, 200),
      macd: this.calculateMACD(close),
      adx: this.calculateADX(high, low, close),
      plusDI: this.calculatePlusDI(high, low, close),
      minusDI: this.calculateMinusDI(high, low, close),

      // Momentum Indicators
      rsi: this.calculateRSI(close),
      stoch: this.calculateStochastic(high, low, close),
      cci: this.calculateCCI(high, low, close),
      williams: this.calculateWilliamsR(high, low, close),

      // Volatility Indicators
      atr: this.calculateATR(high, low, close),
      bollingerBands: this.calculateBollingerBands(close),

      // Volume Indicators
      obv: this.calculateOBV(close, volume),
      cmf: this.calculateCMF(high, low, close, volume),

      // Custom Advanced Metrics
      hurst: this.calculateHurstExponent(close),
      atrRatio: this.calculateAtrRatio(close),
      bbBandwidth: this.calculateBBBandwidth(close),
      structureScore: this.calculatePriceStructureScore(high, low),
      rvi: this.calculateRVI(ohlcv),
      efficiencyRatio: this.calculateEfficiencyRatio(close),
    };
  }

  private calculateEMA(prices: number[], period: number): number[] {
    // TA-Lib EMA calculation
    return TA.EMA(prices, period);
  }

  private calculateMACD(prices: number[]) {
    const { macd, signal, histogram } = TA.MACD(prices, 12, 26, 9);
    return { macd, signal, histogram };
  }

  private calculateADX(
    high: number[],
    low: number[],
    close: number[],
  ): number[] {
    return TA.ADX(high, low, close, 14);
  }

  private calculatePlusDI(
    high: number[],
    low: number[],
    close: number[],
  ): number[] {
    return TA.PLUS_DI(high, low, close, 14);
  }

  private calculateMinusDI(
    high: number[],
    low: number[],
    close: number[],
  ): number[] {
    return TA.MINUS_DI(high, low, close, 14);
  }

  private calculateRSI(prices: number[]): number[] {
    return TA.RSI(prices, 14);
  }

  private calculateStochastic(
    high: number[],
    low: number[],
    close: number[],
  ): { k: number[]; d: number[] } {
    const { slowK, slowD } = TA.STOCH(high, low, close, 14, 3, 0, 3, 0);
    return { k: slowK, d: slowD };
  }

  private calculateCCI(
    high: number[],
    low: number[],
    close: number[],
  ): number[] {
    return TA.CCI(high, low, close, 14);
  }

  private calculateWilliamsR(
    high: number[],
    low: number[],
    close: number[],
  ): number[] {
    return TA.WILLR(high, low, close, 14);
  }

  private calculateATR(
    high: number[],
    low: number[],
    close: number[],
  ): number[] {
    return TA.ATR(high, low, close, 14);
  }

  private calculateBollingerBands(prices: number[]) {
    const { upperBand, middleBand, lowerBand } = TA.BBANDS(prices, 20);
    return { upper: upperBand, middle: middleBand, lower: lowerBand };
  }

  private calculateOBV(prices: number[], volume: number[]): number[] {
    return TA.OBV(prices, volume);
  }

  private calculateCMF(
    high: number[],
    low: number[],
    close: number[],
    volume: number[],
    period: number = 20,
  ): number[] {
    // Chaikin Money Flow implementation
    const cmf: number[] = [];
    for (let i = period; i < close.length; i++) {
      let moneyFlowMultiplier = 0;
      let moneyFlowVolume = 0;

      for (let j = i - period + 1; j <= i; j++) {
        const hl2 = high[j] - low[j] > 0 ? (high[j] + low[j]) / 2 : close[j];
        moneyFlowMultiplier +=
          ((close[j] - hl2) / (high[j] - low[j] || 1)) * volume[j];
        moneyFlowVolume += volume[j];
      }

      cmf.push(moneyFlowMultiplier / moneyFlowVolume);
    }
    return cmf;
  }

  /**
   * Hurst Exponent Calculation (Rescaled Range Analysis)
   * Volatility-adaptive lookback window
   */
  private calculateHurstExponent(prices: number[], rviValue?: number): number {
    // Adaptive lookback based on RVI
    const maxLagBase = 100;
    const maxLag =
      rviValue && rviValue > 60
        ? Math.floor(maxLagBase * 0.7) // Shrink by 30% when RVI > 60
        : maxLagBase;

    const minLag = 10;
    const lags = [];
    const tau = [];

    for (let lag = minLag; lag < maxLag; lag++) {
      const differences = [];
      for (let i = lag; i < prices.length; i++) {
        differences.push(prices[i] - prices[i - lag]);
      }

      // Standard deviation of differences
      const std = this.standardDeviation(differences);
      if (std > 0) {
        lags.push(lag);
        tau.push(std);
      }
    }

    // Linear regression on log-log plot
    if (lags.length < 2) return 0.5; // Default to random walk

    const logLags = lags.map((l) => Math.log(l));
    const logTau = tau.map((t) => Math.log(t));

    const [slope] = linearRegression(logLags, logTau);
    return slope; // Hurst exponent H
  }

  /**
   * Relative Volatility Index (RVI)
   * Measures volatility direction to trigger adaptive lookback
   */
  private calculateRVI(
    ohlcv: Array<{ open: number; high: number; low: number; close: number }>,
  ): number {
    const period = 14;
    const rviValues: number[] = [];

    for (let i = period; i < ohlcv.length; i++) {
      const numerator: number[] = [];
      const denominator: number[] = [];

      for (let j = i - period + 1; j <= i; j++) {
        const range = ohlcv[j].high - ohlcv[j].low;
        const change = ohlcv[j].close - ohlcv[j].open;

        if (range > 0) {
          numerator.push((change / range) * 100);
          denominator.push(1);
        }
      }

      const avgNumerator =
        numerator.reduce((a, b) => a + b, 0) / numerator.length;
      const avgDenominator = denominator.reduce((a, b) => a + b, 0);

      rviValues.push(avgNumerator / (avgDenominator || 1));
    }

    // Smooth with EMA
    return this.calculateEMA(rviValues, period)[rviValues.length - 1] || 50;
  }

  /**
   * Efficiency Ratio (Kaufman's)
   * Measures trend efficiency vs noise
   */
  private calculateEfficiencyRatio(
    prices: number[],
    period: number = 10,
  ): number {
    if (prices.length < period) return 0.5;

    const latestPrices = prices.slice(-period);
    const netChange = Math.abs(
      latestPrices[latestPrices.length - 1] - latestPrices[0],
    );

    let sumOfChanges = 0;
    for (let i = 1; i < latestPrices.length; i++) {
      sumOfChanges += Math.abs(latestPrices[i] - latestPrices[i - 1]);
    }

    return sumOfChanges > 0 ? netChange / sumOfChanges : 0.5;
  }

  private calculateAtrRatio(prices: number[]): number {
    const atr = this.calculateATR(
      prices.map((_, i) => i), // placeholder
      prices.map((_, i) => i), // placeholder
      prices,
      14,
    );

    const currentATR = atr[atr.length - 1];
    const avgATR = atr.slice(-20).reduce((a, b) => a + b, 0) / 20;

    return currentATR / (avgATR || 1);
  }

  private calculateBBBandwidth(prices: number[]): number {
    const { upper, middle, lower } = this.calculateBollingerBands(prices);
    const currentUpper = upper[upper.length - 1];
    const currentMiddle = middle[middle.length - 1];
    const currentLower = lower[lower.length - 1];

    return (currentUpper - currentLower) / (currentMiddle || 1);
  }

  private calculatePriceStructureScore(
    high: number[],
    low: number[],
    swingPoints: number = 20,
  ): number {
    // Detect swing highs and lows using ZigZag-like logic
    const swingHighs: number[] = [];
    const swingLows: number[] = [];

    for (let i = swingPoints; i < high.length - swingPoints; i++) {
      const isSwingHigh =
        high[i] ===
        Math.max(...high.slice(i - swingPoints, i + swingPoints + 1));
      const isSwingLow =
        low[i] === Math.min(...low.slice(i - swingPoints, i + swingPoints + 1));

      if (isSwingHigh) swingHighs.push(high[i]);
      if (isSwingLow) swingLows.push(low[i]);
    }

    // Analyze sequence for HH/HL (bullish) or LL/LH (bearish)
    if (swingHighs.length < 3 || swingLows.length < 3) return 5; // Neutral

    const recentHighs = swingHighs.slice(-3);
    const recentLows = swingLows.slice(-3);

    const isUptrend =
      recentHighs[2] > recentHighs[0] && recentLows[2] > recentLows[0];
    const isDowntrend =
      recentHighs[2] < recentHighs[0] && recentLows[2] < recentLows[0];

    if (isUptrend) return 8; // Strong bullish structure
    if (isDowntrend) return 2; // Strong bearish structure
    return 5; // Mixed/flat structure
  }

  // Utility function
  private standardDeviation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map((value) => Math.pow(value - mean, 2));
    const avgSquareDiff =
      squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }
}
```

---

## MASTRA AGENT WORKFLOWS — EXACT SPECIFICATION

```typescript
// mastra/agents/technical-agent.ts
import { Agent } from "@mastra/core";

export const technicalAgent = new Agent({
  name: "TechnicalExpert",
  instructions: `You are a professional technical analyst with 20 years of experience.
    Analyse the provided indicator data for the instrument and timeframe.
    Return ONLY a JSON object: {"direction": "buy"|"sell"|"neutral", "confidence": 0-100, "reasoning": "string"}
    Be conservative — only issue buy/sell when evidence is strong. Default to neutral.`,
  model: {
    provider: "ANTHROPIC",
    name: "claude-sonnet-4-5",
    toolChoice: "none",
  },
});

export const narrativeAgent = new Agent({
  name: "NarrativeWriter",
  instructions: `You are a professional trading analyst writing signal summaries for traders.
    Write a 2-3 sentence plain-English analysis of why this signal was generated.
    Be specific: mention the regime, key indicators, and what invalidates the signal.
    Never use jargon without explanation. Tone: confident, professional, concise.`,
  model: {
    provider: "ANTHROPIC",
    name: "claude-sonnet-4-5",
    toolChoice: "none",
  },
});

// mastra/workflows/signal-pipeline.ts
export const signalPipeline = new Workflow({
  name: "signal-generation",
  steps: [
    regimeClassificationStep, // classify market regime
    expertVotingStep, // run 5 experts in parallel
    deliberationStep, // bull/bear/risk/fund manager
    levelCalculationStep, // compute TP/SL/entry
    narrativeGenerationStep, // AI text via Claude
    signalWriteStep, // persist to database
    alertDispatchStep, // WebSocket + Telegram
    ragIndexStep, // store regime fingerprint in Qdrant
  ],
});
```

---

## SUBSCRIPTION PLANS — LOCKED

All prices in Nigerian Naira (NGN), billed via Paystack.

| Plan    | Monthly | Quarterly | Yearly   | Instruments          | TFs        | Alerts             |
| ------- | ------- | --------- | -------- | -------------------- | ---------- | ------------------ |
| Starter | ₦4,999  | ₦12,999   | ₦44,999  | Forex only (7 pairs) | H1, H4, D1 | Email only         |
| Pro     | ₦9,999  | ₦26,999   | ₦89,999  | All 15 pairs         | All 7 TFs  | Email + Telegram   |
| Elite   | ₦19,999 | ₦52,999   | ₦179,999 | All 15 pairs         | All 7 TFs  | All + Copy signals |

Trial: 7 days free (Starter features), no card required.

---

## LEGAL DISCLAIMER — MUST APPEAR EVERYWHERE

Display this on every signal card, on the landing page, in the onboarding flow, and in every Telegram message:

> "APEX signals are for informational and educational purposes only. They do not constitute financial advice. Trading foreign exchange, cryptocurrencies, and other financial instruments involves substantial risk of loss. Past signal performance does not guarantee future results. Always trade with money you can afford to lose. APEX is not registered as an investment advisor. You are solely responsible for your trading decisions."

---

### MISSING PIECES — BUILD THESE BEFORE LAUNCH

These are the non-negotiable items identified during design that are not yet implemented:

1. **Backtesting engine** — validate signal logic on 5 years of historical data before going live. Use TypeScript implementation with `technicalindicators` and `mathjs` on downloaded OHLCV from Twelve Data or CCXT (crypto, free).
2. **Paper trading mode** — virtual signal tracker running 60 days before any paying user sees signals. Logs all outcomes into `signal_outcomes` table.
3. **Correlation circuit breaker** — before issuing a signal, check `signals` table for active signals on correlated pairs using currency bucket logic. Cap total USD exposure across correlated clusters. **Implementation**: `CorrelationCircuitBreaker` class with MAX_SIGNALS_PER_BUCKET = 2.
4. **Drift detector** — weekly job that runs KL-divergence test on recent signal distribution vs. historical baseline. Alerts admin if distribution has shifted significantly.
5. **MAE/MFE tracker** — record how far price moved against each winning signal before it recovered. Use this data to calibrate ATR multipliers quarterly.
6. **Signal expiry manager** — track entry buffer breaches and time-based expiries. Update signal status to EXPIRED and log to `signal_outcomes` with expiry_reason.
7. **Slippage-adjusted R:R calculator** — calculate R:R using worst-case entry (entry_price ± entry_buffer). Discard signals where adjusted R:R < 1:1.5.
8. **NewsGuard integration** — integrate economic calendar with "Red Folder" event detection. Set regime_status = 'EXTREME_VOLATILITY' 30min before/after NFP, CPI, FOMC, GDP, Central Bank decisions.
9. **Sanity Check Expert** — implement decoupled validator using HTF RSI divergence and order flow imbalance (if available). Cap confidence at 50% when divergence detected.
10. **Dynamic expert benching system** — track consecutive losses per expert. Reduce weight to 0.2 after 3 consecutive SLs for 12-hour cooling-off period.
11. **Worker thread pool for parallel computation** — use Node.js `worker_threads` for CPU-intensive calculations (Hurst exponent, regime classification across 105 timeframe slots) to prevent blocking main thread.

---

## AREAS OF IMPROVEMENT — PHASE 2 ROADMAP (POST-LAUNCH)

1. **Trend exhaustion detection** — measure how many ATR multiples a trend has already extended before issuing a trend-follow signal. Penalise late entries.
2. **Momentum divergence filter** — if RSI/MACD diverges from price on H4+, cap trend confidence at 55%.
3. **Smart money confluence scoring** — score how many ICT concepts align (order block + FVG + killzone + liquidity sweep = maximum confluence).
4. **Session-specific ATR profiles** — EUR/USD behaves differently in Tokyo vs London open. Maintain per-session ATR averages and use them in sizing.
5. **Mobile app** — React Native app with push notifications (Phase 2 post-launch).
6. **Copy trading dashboard** — Elite users can publish their followed signals; followers see leader accuracy stats.
7. **Fine-tuned model** — once 10,000+ signal outcomes are logged, fine-tune a small model (Fin-R1 or Mistral 7B via LoRA on RunPod) on (regime_context → outcome) pairs.
8. **Multi-broker integration** — optional, regulated jurisdictions only, requires legal review.
9. **Performance optimization** — migrate CPU-intensive calculations (Hurst, RVI, Efficiency Ratio) to Rust WASM modules for 10-50x speedup if Node.js becomes bottleneck.
10. **Machine learning enhancement** — train TensorFlow.js model on regime fingerprints for pattern recognition once sufficient outcome data accumulated.

---

## BUILD ORDER — FOLLOW EXACTLY

### PHASE 1: Foundation & Auth (Steps 1–6)

**Estimated time**: 3–4 days
**Deliverables**: Working monorepo, auth system, database schema deployed

**Steps:**

1. **Monorepo setup** — Next.js 14 + Fastify API + TypeScript signal engine as single unified codebase under Turborepo + pnpm workspaces (no Python)
2. **TypeScript types** — shared `@apex/types` package: Signal, Regime, ExpertVote, Candle, User, Plan, Payment, Outcome, CalendarEvent
3. **Database setup** — TimescaleDB migrations (candles, regime_states) + PostgreSQL migrations (all app tables) + Drizzle ORM schema + seed data (plans, instrument list)
4. **Supabase auth** — email/password signup, login, middleware route protection, session refresh, password reset flow
5. **Redis setup** — Upstash Redis client, cache helpers, BullMQ queue initialisation
6. **Base API server** — Fastify server, CORS, authentication middleware, error handler, health endpoint

**✅ PHASE 1 CHECKPOINT — before Phase 2, confirm:**

- [ ] All environment variables set
- [ ] TimescaleDB connected and hypertables created
- [ ] PostgreSQL all migrations run successfully
- [ ] Supabase auth flow tested (signup → login → protected route)
- [ ] Redis connection verified
- [ ] User ready to proceed

**IF USER SAYS "STOP HERE"**: Save progress. Next session = Phase 2 Step 7.

---

### PHASE 2: Market Data Engine (Steps 7–12)

**Estimated time**: 4–5 days
**Deliverables**: Live candle data flowing, all indicators calculating, regime classifier working

**Steps:** 7. **Historical data import** — TypeScript script to download 5 years OHLCV for all 15 instruments × 7 timeframes from Twelve Data (free tier: 800 requests/day) → store in TimescaleDB candles table 8. **Real-time feed** — WebSocket connections to Binance (crypto, free) + Twelve Data (forex, free tier) → normalise and write M1 candles → aggregate to all timeframes on close 9. **Indicator engine** — TypeScript TA-Lib service: all indicators, Hurst exponent, ATR ratio, BB bandwidth, price structure score, RVI, Efficiency Ratio for every (instrument × timeframe) on each candle close 10. **Regime classifier** — implement 5-pillar classification + cascade logic + hysteresis check → write results to regime_states table + cache in Redis (TTL: 5 minutes) 11. **Economic calendar** — ForexFactory API fetcher (free) → BullMQ hourly job → store in calendar_events → build suppression checker middleware 12. **Backtesting runner** — TypeScript backtesting engine with vectorbt-like logic → run regime + signal logic on 5 years history → output expectancy, Sharpe, win rate, max drawdown per (instrument × strategy × timeframe) → store results for review

**✅ PHASE 2 CHECKPOINT — before Phase 3, confirm:**

- [ ] Candles flowing in real-time for all instruments
- [ ] Indicators calculating correctly (verify ADX, RSI manually on TradingView)
- [ ] Regime classifier producing sensible outputs (not all-choppy or all-trending)
- [ ] Backtest results show positive expectancy on at least 60% of (instrument × TF) combinations
- [ ] Calendar events loading and suppression logic tested
- [ ] User ready to proceed

**IF USER SAYS "STOP HERE"**: Save progress. Next session = Phase 3 Step 13.

---

### PHASE 3: Signal Engine (Steps 13–20)

**Estimated time**: 5–7 days
**Deliverables**: Full signal pipeline running, AI narrative generating, paper trading mode active

**Steps:** 13. **Expert agents — Technical + Smart Money** — implement indicator-based vote logic, order block detection, FVG detection, killzone windows, candlestick pattern scoring 14. **Expert agents — Sentiment + Macro + Quant** — integrate Crypto Fear & Greed API, GDELT news sentiment, COT report parser (CFTC free CSV), DXY correlation checker, quant historical edge calculator from signal_outcomes 15. **Gating network** — implement weight routing per (instrument × regime × timeframe), Redis-cached weights, adaptation trigger on outcome write 16. **Deliberation layer** — Mastra workflow: Bull researcher → Bear researcher → Risk manager → Fund manager agents, all prompts as specified, Claude Sonnet API 17. **TP/SL engine** — ATR multipliers, spread model, three-target architecture, R:R gate, lot size calculator 18. **Signal writer** — full signal object construction → quality tag assignment → write to signals table → cache active signals in Redis 19. **Paper trading mode** — virtual portfolio tracker: log all signals, simulate TP/SL hits against live price feed, write to signal_outcomes, generate daily accuracy report for admin 20. **Narrative generator** — Mastra narrative agent: build context prompt from all expert outputs → Claude Sonnet → store ai_narrative on signal record

**✅ PHASE 3 CHECKPOINT — before Phase 4, confirm:**

- [ ] Signal pipeline running end-to-end without errors
- [ ] Paper trading active and logging outcomes
- [ ] AI narratives generating and making sense
- [ ] At least 48 hours of paper trading data collected
- [ ] Signal accuracy in paper mode > 50% on TP1 (otherwise debug before proceeding)
- [ ] User ready to proceed

**IF USER SAYS "STOP HERE"**: Save progress. Next session = Phase 4 Step 21.

---

### PHASE 4: Dashboard & UI (Steps 21–27)

**Estimated time**: 5–6 days
**Deliverables**: Full working dashboard, all pages, zero-config UX

**Steps:** 21. **Frontend skeleton** — Next.js App Router setup, Tailwind config, shadcn/ui install, design tokens (colours, typography, spacing), global layout, auth middleware, error boundaries 22. **Landing page** — hero, how it works, sample signal card (static), pricing preview, disclaimer, CTA, mobile responsive 23. **Main dashboard** — pair selector (left panel), timeframe signal strip (right panel), real-time WebSocket updates, "live" indicator, pair tile with 7-dot summary 24. **Signal card component** — full signal card: direction pill, confidence bar, price levels table, R:R visual bar, expert vote bars, AI narrative, lot size display (if account size set), quality tags 25. **Watchlist + History pages** — custom watchlist management, signal history with outcome badges (TP1/TP2/TP3/SL), accuracy stats per pair 26. **Settings page** — account size input, risk % slider (0.5–5%), Telegram link flow (show bot link + /start command), notification preferences 27. **Admin panel** — signal accuracy dashboard, expert performance table, paper trading stats, user list, subscription management, calendar events view

**✅ PHASE 4 CHECKPOINT — before Phase 5, confirm:**

- [ ] Dashboard loads with live signals in under 2 seconds
- [ ] WebSocket updates working (signal updates appear without refresh)
- [ ] Signal card displays all fields correctly
- [ ] Lot size calculates correctly when account size set
- [ ] Mobile responsive (test on 375px width)
- [ ] User ready to proceed

**IF USER SAYS "STOP HERE"**: Save progress. Next session = Phase 5 Step 28.

---

### PHASE 5: Payments & Alerts (Steps 28–32)

**Estimated time**: 3–4 days
**Deliverables**: Paystack billing live, Telegram alerts working, email notifications active

**Steps:** 28. **Subscription gating** — middleware to check subscription_status on protected routes, trial countdown display, paywall screen for expired users 29. **Paystack integration** — plan selection page, Paystack Popup initialisation, payment webhook handler (verify signature, activate subscription, handle renewals), subscription management (cancel, upgrade) 30. **Email notifications** — SendGrid/Resend templates: welcome email, payment receipt, subscription expiry warning (7 days, 3 days, 1 day), weekly signal performance summary 31. **Telegram bot** — bot setup with BotFather, /start command links Telegram chat ID to user account, signal alert formatter (clean, readable message with all levels), high-confidence-only filter (≥70%), opt-out command 32. **Web push notifications** — VAPID setup, service worker, push subscription on dashboard, browser notification on new high-quality signal

**✅ PHASE 5 CHECKPOINT — before Phase 6, confirm:**

- [ ] Paystack test payment completes and subscription activates
- [ ] Webhook verified with Paystack signature
- [ ] Telegram bot sends formatted signal messages
- [ ] Email templates rendering correctly (test in Gmail, Apple Mail)
- [ ] Push notifications working in Chrome
- [ ] User ready to proceed

**IF USER SAYS "STOP HERE"**: Save progress. Next session = Phase 6 Step 33.

---

### PHASE 6: Learning System + Copy Signals (Steps 33–38)

**Estimated time**: 4–5 days
**Deliverables**: Full feedback loop active, expert weights adapting, copy signal feature live

**Steps:** 33. **Outcome tracker** — BullMQ job every 5min: check all active signals against live price, detect TP1/TP2/TP3/SL hits, write to signal_outcomes, update signal.is_active = false 34. **Expert weight adaptation** — after each outcome written: update expert_accuracy rolling window, recompute gating weights, cache new weights in Redis, log weight changes to admin 35. **Regime RAG indexer** — on each signal close: embed regime fingerprint as 128-dim vector, store in Qdrant with outcome payload, query similar past setups to influence future confidence scores 36. **Drift detector** — weekly BullMQ job: KL-divergence test on signal distribution of last 30 days vs previous 90 days baseline, email admin if drift detected 37. **Accuracy dashboard** — admin page: per-expert accuracy heat map (instrument × timeframe), confidence calibration chart (predicted vs actual), strategy win rates by regime, expectancy trends over time 38. **Copy signals** — Elite plan feature: users can follow other Elite users' signal activity, follower dashboard shows leader's active signals in real time, leader accuracy badge on profile

**✅ PHASE 6 CHECKPOINT — before Phase 7, confirm:**

- [ ] Outcomes being logged correctly for all closed signals
- [ ] Expert accuracy table updating after each outcome
- [ ] Qdrant vectors storing and similarity search working
- [ ] Copy signal feed loading for Elite users
- [ ] Admin accuracy dashboard showing meaningful data
- [ ] User ready to proceed

**IF USER SAYS "STOP HERE"**: Save progress. Next session = Phase 7 Step 39.

---

### PHASE 7: Optimisation & Launch (Steps 39–43)

**Estimated time**: 3–4 days
**Deliverables**: Production-ready, deployed, monitored

**Steps:** 39. **Performance** — React Query caching strategy, Redis cache-aside for all signal reads, image optimisation, lazy loading, Lighthouse score > 90 on mobile 40. **Security audit** — JWT validation, Paystack webhook signature verification, rate limiting (100 req/min per IP), input sanitisation with Zod on all endpoints, SQL injection prevention via Drizzle ORM parameterised queries, env var audit 41. **Error monitoring** — Sentry (free tier) for both frontend and API, error alerting to Telegram admin channel, BullMQ job failure alerts 42. **Deployment** — Vercel for Next.js frontend, Railway for Fastify API + Python engine + n8n, Fly.io as backup, TimescaleDB on Supabase or Railway, Qdrant on Railway with persistent volume 43. **Launch checklist** — legal disclaimer on all pages verified, Paystack live mode keys swapped, all env vars set in production, DNS configured, SSL verified, smoke test all critical paths (signup → trial → upgrade → signal → alert)

**✅ FINAL LAUNCH CHECKLIST:**

- [ ] All 43 steps completed
- [ ] Paper trading ran 60+ days with positive expectancy confirmed
- [ ] Paystack live mode tested with real NGN transaction
- [ ] Legal disclaimer reviewed (Nigerian SEC compliance)
- [ ] All environment variables in production (never in code)
- [ ] Monitoring active — errors alerting to admin
- [ ] Smoke test passed: full user journey works end-to-end
- [ ] APEX is live

---

## PAUSE / RESUME PROTOCOL

**When user says "Let's pause here":**

1. Note the last completed step number and name
2. Summarise what was accomplished this session
3. List any files that need saving or commands that must run before closing
4. State exactly what step next session starts on

**Example resume message:**

```
Welcome back! Last session ended after completing Step 20 (Narrative generator).

Today we continue with Phase 4: Dashboard & UI
Starting with: Step 21 — Frontend skeleton (Next.js App Router setup)

Before we begin, please confirm:
1. Your development server (Fastify API) is running
2. Signal pipeline is running and producing signals in Redis
3. You have shadcn/ui CLI available
4. Ready to start building the frontend?
```

---

## CLARIFICATION RULES — NO ASSUMPTIONS

**ALWAYS ask before proceeding when:**

1. **Missing environment variables** → "I need [VAR] for [feature]. Do you want to: a) provide it now, b) skip temporarily, c) use a placeholder?"
2. **Third-party services** → "Do you have a [service] account? Should I use test mode or live mode?"
3. **Design decisions** → "The spec says [X]. Should I use this or do you have a preference?"
4. **Data requirements** → "I need to seed [data]. Should I use the default list or do you have specific data?"
5. **Step dependencies** → "Step N requires Step M to be complete. Have you confirmed M is working?"

**NEVER assume:**

- API keys or accounts exist
- Default values are acceptable for production
- User wants to proceed without confirmation
- Missing context can be filled with guesses

**ALWAYS confirm:**

- Readiness before each major integration
- Understanding of what will be built
- Approval to proceed with specified approach

---

_APEX Master Prompt v1.0 — All decisions locked. Build exactly this._
