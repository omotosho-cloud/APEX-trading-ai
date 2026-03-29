import Link from "next/link";

const ADMIN_LINKS = [
  { href: "/admin/signals",  label: "All Signals",        desc: "View all signals with outcomes and accuracy stats" },
  { href: "/admin/users",    label: "User Management",    desc: "View users, subscriptions, and activity" },
  { href: "/admin/accuracy", label: "Expert Accuracy",    desc: "Per-expert accuracy heatmap and performance trends" },
];

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-surface p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-xs text-text-muted hover:text-primary">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-text-primary mt-2">Admin Panel</h1>
          <p className="text-text-muted text-sm mt-1">APEX system management</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {ADMIN_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-surface-card border border-surface-border rounded-xl p-5 hover:border-primary/40 transition-colors"
            >
              <p className="font-semibold text-text-primary mb-1">{link.label}</p>
              <p className="text-xs text-text-muted">{link.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
