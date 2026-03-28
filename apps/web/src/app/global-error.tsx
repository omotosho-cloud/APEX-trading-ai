"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-surface text-text-primary flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-text-secondary text-sm">{error.message}</p>
          <button
            onClick={reset}
            className="text-primary text-sm hover:underline"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
