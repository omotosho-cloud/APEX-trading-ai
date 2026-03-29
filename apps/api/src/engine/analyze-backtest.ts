#!/usr/bin/env node
/**
 * Backtest Result Analyzer
 * Generates detailed reports and visualizations from backtest results
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const RESULTS_FILE = join(process.cwd(), "backtest-results.json");

type Metrics = {
  totalTrades: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  cagr: number;
  profitFactor: number;
  expectancy: number;
  sortinoRatio: number;
  calmarRatio: number;
  recoveryFactor: number;
  var95: number;
  skewness: number;
  kurtosis: number;
};

type Result = {
  instrument: string;
  timeframe: string;
  metrics: Metrics;
  monthlyStats: Array<{
    month: string;
    trades: number;
    winRate: number;
    totalReturn: number;
    maxDrawdown: number;
  }>;
  strategyBreakdown: {
    byRegime: Record<
      string,
      { trades: number; winRate: number; avgReturn: number }
    >;
    byDirection: {
      buy: { trades: number; winRate: number; avgReturn: number };
      sell: { trades: number; winRate: number; avgReturn: number };
    };
    byConfidence: {
      high: { range: string; trades: number; winRate: number };
      medium: { range: string; trades: number; winRate: number };
      low: { range: string; trades: number; winRate: number };
    };
  };
};

function loadResults(): Result[] {
  try {
    const data = readFileSync(RESULTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to load results. Run the backtest first.");
    process.exit(1);
  }
}

function generateSummary(results: Result[]) {
  const passing = results.filter(
    (r) =>
      r.metrics.winRate >= 0.5 &&
      r.metrics.sharpeRatio > 0 &&
      r.metrics.maxDrawdown < 0.2,
  );

  const summary = {
    total: results.length,
    passing: passing.length,
    passRate: (passing.length / results.length) * 100,

    avgMetrics: {
      winRate:
        results.reduce((s, r) => s + r.metrics.winRate, 0) / results.length,
      sharpe:
        results.reduce((s, r) => s + r.metrics.sharpeRatio, 0) / results.length,
      drawdown:
        results.reduce((s, r) => s + r.metrics.maxDrawdown, 0) / results.length,
      cagr: results.reduce((s, r) => s + r.metrics.cagr, 0) / results.length,
    },

    bestByMetric: {
      cagr: results.reduce(
        (best, r) => (r.metrics.cagr > best.metrics.cagr ? r : best),
        results[0]!,
      ),
      sharpe: results.reduce(
        (best, r) =>
          r.metrics.sharpeRatio > best.metrics.sharpeRatio ? r : best,
        results[0]!,
      ),
      winRate: results.reduce(
        (best, r) => (r.metrics.winRate > best.metrics.winRate ? r : best),
        results[0]!,
      ),
      lowestDD: results.reduce(
        (best, r) =>
          r.metrics.maxDrawdown < best.metrics.maxDrawdown ? r : best,
        results[0]!,
      ),
    },
  };

  return summary;
}

function generateHeatmapData(results: Result[]) {
  const heatmap: Record<
    string,
    Record<string, { sharpe: number; winRate: number; trades: number }>
  > = {};

  for (const result of results) {
    if (!heatmap[result.instrument]) {
      heatmap[result.instrument] = {};
    }
    heatmap[result.instrument]![result.timeframe] = {
      sharpe: result.metrics.sharpeRatio,
      winRate: result.metrics.winRate,
      trades: result.metrics.totalTrades,
    };
  }

  return heatmap;
}

function generateRegimeAnalysis(results: Result[]) {
  const regimeStats: Record<
    string,
    { totalTrades: number; avgWinRate: number; avgReturn: number }
  > = {};

  for (const result of results) {
    for (const [regime, stats] of Object.entries(
      result.strategyBreakdown.byRegime,
    )) {
      if (!regimeStats[regime]) {
        regimeStats[regime] = { totalTrades: 0, avgWinRate: 0, avgReturn: 0 };
      }
      regimeStats[regime].totalTrades += stats.trades;
      regimeStats[regime].avgWinRate += stats.winRate * stats.trades;
      regimeStats[regime].avgReturn += stats.avgReturn * stats.trades;
    }
  }

  // Weighted averages
  for (const regime of Object.keys(regimeStats)) {
    const stats = regimeStats[regime];
    if (stats && stats.totalTrades > 0) {
      const total = stats.totalTrades;
      stats.avgWinRate /= total;
      stats.avgReturn /= total;
    }
  }

  return regimeStats;
}

function generateMonthlyTrends(results: Result[]) {
  const monthlyData: Record<string, { returns: number[]; trades: number }> = {};

  for (const result of results) {
    for (const month of result.monthlyStats) {
      if (!monthlyData[month.month]) {
        monthlyData[month.month] = { returns: [], trades: 0 };
      }
      monthlyData[month.month]!.returns.push(month.totalReturn);
      monthlyData[month.month]!.trades += month.trades;
    }
  }

  const trends = Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      avgReturn: data.returns.reduce((a, b) => a + b, 0) / data.returns.length,
      totalTrades: data.trades,
      positiveMonths: data.returns.filter((r) => r > 0).length,
      negativeMonths: data.returns.filter((r) => r < 0).length,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return trends;
}

function exportCharts(
  summary: any,
  heatmap: any,
  regimeAnalysis: any,
  monthlyTrends: any,
) {
  // Generate Chart.js compatible data
  const charts = {
    summary,
    heatmap,
    regimeAnalysis,
    monthlyTrends,
  };

  writeFileSync(
    join(process.cwd(), "backtest-charts-data.json"),
    JSON.stringify(charts, null, 2),
  );

  console.log("✅ Charts data exported to: backtest-charts-data.json");
}

function printReport(summary: any, regimeAnalysis: any, monthlyTrends: any) {
  console.log("\n" + "=".repeat(70));
  console.log("   APEX BACKTEST ANALYSIS REPORT");
  console.log("=".repeat(70));

  console.log(`\n📊 Overall Performance`);
  console.log("-".repeat(70));
  console.log(`Total Combinations:     ${summary.total}`);
  console.log(
    `Passing Rate:           ${summary.pass}/${summary.total} (${summary.passRate.toFixed(1)}%)`,
  );
  console.log(
    `Average Win Rate:       ${(summary.avgMetrics.winRate * 100).toFixed(2)}%`,
  );
  console.log(
    `Average Sharpe:         ${summary.avgMetrics.sharpe.toFixed(2)}`,
  );
  console.log(
    `Average Drawdown:       ${(summary.avgMetrics.drawdown * 100).toFixed(2)}%`,
  );
  console.log(
    `Average CAGR:           ${(summary.avgMetrics.cagr * 100).toFixed(2)}%`,
  );

  console.log(`\n🏆 Top Performers`);
  console.log("-".repeat(70));
  console.log(
    `Best CAGR:              ${summary.bestByMetric.cagr.instrument}/${summary.bestByMetric.cagr.timeframe} (${(summary.bestByMetric.cagr.metrics.cagr * 100).toFixed(2)}%)`,
  );
  console.log(
    `Best Sharpe:            ${summary.bestByMetric.sharpe.instrument}/${summary.bestByMetric.sharpe.timeframe} (${summary.bestByMetric.sharpe.metrics.sharpeRatio.toFixed(2)})`,
  );
  console.log(
    `Best Win Rate:          ${summary.bestByMetric.winRate.instrument}/${summary.bestByMetric.winRate.timeframe} (${(summary.bestByMetric.winRate.metrics.winRate * 100).toFixed(2)}%)`,
  );
  console.log(
    `Lowest Drawdown:        ${summary.bestByMetric.lowestDD.instrument}/${summary.bestByMetric.lowestDD.timeframe} (${(summary.bestByMetric.lowestDD.metrics.maxDrawdown * 100).toFixed(2)}%)`,
  );

  console.log(`\n🎯 Regime Analysis`);
  console.log("-".repeat(70));
  for (const [regime, stats] of Object.entries(regimeAnalysis) as [string, { totalTrades: number; avgWinRate: number; avgReturn: number }][]) {
    const emoji =
      regime.includes("bull") || regime.includes("trending")
        ? "📈"
        : regime.includes("bear")
          ? "📉"
          : "➡️";
    console.log(
      `${emoji} ${regime.padEnd(20)} | Trades: ${String(stats.totalTrades).padStart(4)} | WR: ${(stats.avgWinRate * 100).toFixed(1)}% | Avg Return: ${(stats.avgReturn * 100).toFixed(2)}%`,
    );
  }

  console.log(`\n📅 Monthly Trends`);
  console.log("-".repeat(70));
  const bestMonth = monthlyTrends.reduce(
    (
      best: { month: string; avgReturn: number; totalTrades: number },
      m: { month: string; avgReturn: number; totalTrades: number },
    ) => (m.avgReturn > best.avgReturn ? m : best),
    monthlyTrends[0]!,
  );
  const worstMonth = monthlyTrends.reduce(
    (
      best: { month: string; avgReturn: number; totalTrades: number },
      m: { month: string; avgReturn: number; totalTrades: number },
    ) => (m.avgReturn < best.avgReturn ? m : best),
    monthlyTrends[0]!,
  );
  console.log(
    `Best Month:             ${bestMonth.month} (${(bestMonth.avgReturn * 100).toFixed(2)}%)`,
  );
  console.log(
    `Worst Month:            ${worstMonth.month} (${(worstMonth.avgReturn * 100).toFixed(2)}%)`,
  );
  const mostActive = monthlyTrends.reduce(
    (
      best: { month: string; avgReturn: number; totalTrades: number },
      m: { month: string; avgReturn: number; totalTrades: number },
    ) => (m.totalTrades > best.totalTrades ? m : best),
    monthlyTrends[0]!,
  );
  console.log(
    `Most Active:            ${mostActive.month} (${mostActive.totalTrades} trades)`,
  );

  console.log("\n" + "=".repeat(70));
  console.log(
    "💡 TIP: Use the exported JSON files to create visualizations in your",
  );
  console.log(
    "   preferred charting tool (Chart.js, TradingView, Excel, etc.)",
  );
  console.log("=".repeat(70) + "\n");
}

function main() {
  console.log("\n🔍 Analyzing backtest results...\n");

  const results = loadResults();
  const summary = generateSummary(results);
  const heatmap = generateHeatmapData(results);
  const regimeAnalysis = generateRegimeAnalysis(results);
  const monthlyTrends = generateMonthlyTrends(results);

  printReport(summary, regimeAnalysis, monthlyTrends);
  exportCharts(summary, heatmap, regimeAnalysis, monthlyTrends);

  // Export detailed CSV for Excel analysis
  const csvLines = [
    [
      "Instrument",
      "Timeframe",
      "Trades",
      "WinRate",
      "Sharpe",
      "CAGR",
      "MaxDD",
      "ProfitFactor",
      "Expectancy",
    ].join(","),
    ...results.map((r) =>
      [
        r.instrument,
        r.timeframe,
        r.metrics.totalTrades,
        r.metrics.winRate,
        r.metrics.sharpeRatio,
        r.metrics.cagr,
        r.metrics.maxDrawdown,
        r.metrics.profitFactor,
        r.metrics.expectancy,
      ].join(","),
    ),
  ];

  writeFileSync(
    join(process.cwd(), "backtest-results.csv"),
    csvLines.join("\n"),
  );
  console.log("✅ CSV exported to: backtest-results.csv");
}

main();
