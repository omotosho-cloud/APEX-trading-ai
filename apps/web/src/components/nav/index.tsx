"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HIDDEN_PREFIXES = ["/dashboard", "/admin"];
const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

export default function SharedNav() {
  const pathname = usePathname();

  // Dashboard and admin have their own nav — hide this one
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  // Auth pages — minimal logo only
  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    return (
      <header className="border-b border-surface-border bg-surface/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 flex items-center justify-between h-14">
          <Link href="/" className="font-bold text-lg tracking-tight text-text-primary">
            APEX <span className="text-primary text-xs font-mono ml-1">AI</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {pathname.startsWith("/login") ? (
              <>
                <span className="text-text-muted">No account?</span>
                <Link
                  href="/register"
                  className="bg-primary hover:bg-primary-dark text-white px-4 py-1.5 rounded-lg font-medium transition-colors"
                >
                  Start free
                </Link>
              </>
            ) : (
              <>
                <span className="text-text-muted">Have an account?</span>
                <Link
                  href="/login"
                  className="border border-surface-border hover:border-primary text-text-secondary hover:text-text-primary px-4 py-1.5 rounded-lg font-medium transition-colors"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
    );
  }

  // Public / landing pages — full marketing nav
  return (
    <header className="sticky top-0 z-50 border-b border-surface-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 flex items-center justify-between h-14">
        <Link href="/" className="font-bold text-lg tracking-tight text-text-primary">
          APEX <span className="text-primary text-xs font-mono ml-1">AI</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-text-secondary">
          <a href="/#features" className="hover:text-text-primary transition-colors">Features</a>
          <a href="/#pricing" className="hover:text-text-primary transition-colors">Pricing</a>
          <a href="/#about" className="hover:text-text-primary transition-colors">About</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm bg-primary hover:bg-primary-dark text-white px-4 py-1.5 rounded-lg font-medium transition-colors"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
