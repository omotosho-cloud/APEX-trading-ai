"""
MT5 Historical Data Fetcher — APEX
====================================
Fetches OHLCV candles from MetaTrader 5 and inserts them into TimescaleDB.

Usage:
  python mt5_fetch.py                          # 2020-01-01 → today, all pairs/timeframes
  python mt5_fetch.py --from 2022-01-01        # custom start date
  python mt5_fetch.py --instrument EURUSD      # single pair
  python mt5_fetch.py --timeframe H4           # single timeframe

Requirements:
  C:/Python313/python.exe -m pip install MetaTrader5 psycopg2-binary python-dotenv

Environment:
  TIMESCALE_URL must be set in apps/api/.env
"""

import argparse
import os
import sys
from datetime import datetime, timezone

import MetaTrader5 as mt5
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

TIMESCALE_URL = os.environ.get("TIMESCALE_URL")
if not TIMESCALE_URL:
    print("ERROR: TIMESCALE_URL is not set.", file=sys.stderr)
    sys.exit(1)

FOREX_INSTRUMENTS = [
    "EURUSD", "GBPUSD", "USDJPY", "USDCHF",
    "AUDUSD", "USDCAD", "NZDUSD", "EURGBP", "EURJPY", "GBPJPY",
]

MT5_TIMEFRAMES: dict[str, int] = {
    "M5":  mt5.TIMEFRAME_M5,
    "M15": mt5.TIMEFRAME_M15,
    "M30": mt5.TIMEFRAME_M30,
    "H1":  mt5.TIMEFRAME_H1,
    "H4":  mt5.TIMEFRAME_H4,
    "D1":  mt5.TIMEFRAME_D1,
    "W1":  mt5.TIMEFRAME_W1,
}

INSERT_SQL = """
    INSERT INTO candles (time, instrument, timeframe, open, high, low, close, volume)
    VALUES %s
    ON CONFLICT (time, instrument, timeframe) DO NOTHING
"""

def fetch_candles(instrument: str, timeframe_label: str, tf: int, from_date: datetime) -> list[tuple]:
    to_date = datetime.now(tz=timezone.utc)
    rates = mt5.copy_rates_range(instrument, tf, from_date, to_date)
    if rates is None or len(rates) == 0:
        print(f"  [SKIP] {instrument} {timeframe_label} — no data (mt5 error: {mt5.last_error()})")
        return []

    return [
        (
            datetime.fromtimestamp(r["time"], tz=timezone.utc),
            instrument,
            timeframe_label,
            str(r["open"]),
            str(r["high"]),
            str(r["low"]),
            str(r["close"]),
            str(r["tick_volume"]),
        )
        for r in rates
    ]


CHUNK_SIZE = 1000

def insert_rows(rows: list[tuple]) -> int:
    """Insert rows in chunks, reconnecting on failure."""
    conn = psycopg2.connect(TIMESCALE_URL)
    total = 0
    try:
        cur = conn.cursor()
        for i in range(0, len(rows), CHUNK_SIZE):
            chunk = rows[i : i + CHUNK_SIZE]
            execute_values(cur, INSERT_SQL, chunk)
            total += cur.rowcount
            conn.commit()
        cur.close()
    finally:
        conn.close()
    return total


def run(instruments: list[str], timeframes: dict[str, int], from_date: datetime) -> None:
    if not mt5.initialize():
        print(f"ERROR: MT5 initialize() failed — {mt5.last_error()}", file=sys.stderr)
        sys.exit(1)

    print(f"MT5 connected: {mt5.terminal_info().name} | account: {mt5.account_info().login}")
    print(f"Fetching from {from_date.date()} → today\n")

    total_inserted = 0

    for instrument in instruments:
        for label, tf in timeframes.items():
            rows = fetch_candles(instrument, label, tf, from_date)
            if not rows:
                continue
            inserted = insert_rows(rows)
            total_inserted += inserted
            print(f"  [OK] {instrument} {label:>3} — {len(rows)} fetched, {inserted} new rows")

    mt5.shutdown()
    print(f"\nDone. Total rows inserted: {total_inserted}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch MT5 history into TimescaleDB")
    parser.add_argument("--from",       type=str, default="2020-01-01", dest="from_date", help="Start date YYYY-MM-DD (default: 2020-01-01)")
    parser.add_argument("--instrument", type=str, default=None,         help="Single instrument e.g. EURUSD")
    parser.add_argument("--timeframe",  type=str, default=None,         help="Single timeframe e.g. H4")
    args = parser.parse_args()

    if args.instrument and args.instrument not in FOREX_INSTRUMENTS:
        print(f"ERROR: Unknown instrument '{args.instrument}'. Valid: {FOREX_INSTRUMENTS}", file=sys.stderr)
        sys.exit(1)

    if args.timeframe and args.timeframe not in MT5_TIMEFRAMES:
        print(f"ERROR: Unknown timeframe '{args.timeframe}'. Valid: {list(MT5_TIMEFRAMES.keys())}", file=sys.stderr)
        sys.exit(1)

    try:
        from_date = datetime.fromisoformat(args.from_date).replace(tzinfo=timezone.utc)
    except ValueError:
        print(f"ERROR: Invalid date '{args.from_date}'. Use YYYY-MM-DD format.", file=sys.stderr)
        sys.exit(1)

    selected_instruments = [args.instrument] if args.instrument else FOREX_INSTRUMENTS
    selected_timeframes  = {args.timeframe: MT5_TIMEFRAMES[args.timeframe]} if args.timeframe else MT5_TIMEFRAMES

    run(selected_instruments, selected_timeframes, from_date)
