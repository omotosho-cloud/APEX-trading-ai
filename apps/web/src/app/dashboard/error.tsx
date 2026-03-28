"use client";
export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex h-screen items-center justify-center bg-surface">
      <div className="text-center space-y-3">
        <p className="text-text-secondary">Dashboard error</p>
        <button onClick={reset} className="text-primary text-sm hover:underline">Reload</button>
      </div>
    </div>
  );
}
