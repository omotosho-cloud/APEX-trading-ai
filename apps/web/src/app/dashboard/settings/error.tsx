"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex h-screen items-center justify-center bg-surface">
      <div className="text-center space-y-3">
        <p className="text-text-secondary text-sm">Something went wrong</p>
        <button onClick={reset} className="text-primary text-sm hover:underline">Try again</button>
      </div>
    </div>
  );
}
