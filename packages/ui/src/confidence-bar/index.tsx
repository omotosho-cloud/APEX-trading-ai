type ConfidenceBarProps = {
  value: number; // 0–100
  label?: string;
  className?: string;
};

export const ConfidenceBar = ({ value, label, className = "" }: ConfidenceBarProps) => {
  const clamped = Math.min(100, Math.max(0, value));
  const color =
    clamped >= 80 ? "bg-signal-buy" :
    clamped >= 60 ? "bg-primary" :
    "bg-signal-neutral";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {label !== undefined && (
        <span className="text-xs font-mono text-text-secondary w-8 text-right">{label}</span>
      )}
    </div>
  );
};
