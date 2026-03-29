"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLogout } from "@apex/lib";
import { useState } from "react";
import toast from "react-hot-toast";

type DashboardNavProps = {
  lastUpdated?: Date | null;
  isLive?: boolean;
};

export default function DashboardNav({ lastUpdated, isLive = true }: DashboardNavProps) {
  const router = useRouter();
  const { logout } = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Logout failed");
    }
  };

  const secondsAgo = lastUpdated
    ? Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
    : null;

  return (
    <header className="h-14 border-b border-surface-border bg-surface flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="font-bold text-text-primary tracking-tight">
          APEX <span className="text-primary text-xs font-mono">AI</span>
        </Link>
        <div className="flex items-center gap-1.5 text-xs">
          <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-signal-buy animate-pulse-slow" : "bg-text-muted"}`} />
          <span className="text-text-muted">
            {isLive ? (secondsAgo !== null ? `updated ${secondsAgo}s ago` : "Live") : "Connecting…"}
          </span>
        </div>
      </div>

      <nav className="hidden md:flex items-center gap-1 text-sm">
        {[
          { href: "/dashboard",          label: "Signals" },
          { href: "/dashboard/watchlist", label: "Watchlist" },
          { href: "/dashboard/history",   label: "History" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/settings"
          className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
          title="Settings"
        >
          ⚙
        </Link>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="h-8 w-8 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center hover:bg-primary/30 transition-colors"
          >
            U
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 w-40 bg-surface-card border border-surface-border rounded-xl shadow-xl z-50 overflow-hidden">
              <Link
                href="/dashboard/settings"
                className="block px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-elevated transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm text-signal-sell hover:bg-surface-elevated transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
