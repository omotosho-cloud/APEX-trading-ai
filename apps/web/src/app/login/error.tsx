"use client";

export default function LoginError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center space-y-3">
        <p className="text-text-secondary text-sm">Something went wrong on the login page.</p>
        <button onClick={reset} className="text-primary text-sm hover:underline">
          Try again
        </button>
      </div>
    </main>
  );
}
