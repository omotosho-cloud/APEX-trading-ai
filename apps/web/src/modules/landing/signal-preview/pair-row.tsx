type PairRowProps = {
  pair: string;
  dir: string;
  conf: number;
};

export default function PairRow({ pair, dir, conf }: PairRowProps) {
  const isNeutral = dir === "───";
  const color = isNeutral
    ? "text-text-muted"
    : dir === "BUY"
    ? "text-signal-buy"
    : "text-signal-sell";
  const barColor = isNeutral
    ? "bg-text-muted"
    : dir === "BUY"
    ? "bg-signal-buy"
    : "bg-signal-sell";

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-surface-elevated transition-colors cursor-default">
      <span className="text-sm font-medium text-text-primary w-24">{pair}</span>
      <span className={`text-xs font-bold w-10 ${color}`}>{dir}</span>
      <div className="flex-1 mx-3 h-1 rounded-full bg-surface-elevated overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${conf}%` }} />
      </div>
      <span className="text-xs font-mono text-text-muted w-8 text-right">{conf}%</span>
    </div>
  );
}
