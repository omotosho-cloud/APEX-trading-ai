"use client";

import { useUserSettings, useUpdateUserSettings } from "@apex/lib";
import { useForm, Controller } from "react-hook-form";
import { Button, SectionErrorBoundary, Skeleton } from "@apex/ui";
import Link from "next/link";
import toast from "react-hot-toast";
import type { UpdateUserSettings } from "@apex/types";

export default function SettingsPage() {
  const { data: user, loading } = useUserSettings();
  const { updateSettings, isLoading } = useUpdateUserSettings();

  const { register, handleSubmit, control, formState: { errors } } = useForm<UpdateUserSettings>({
    values: {
      account_size: user?.account_size ? Number(user.account_size) : null,
      risk_pct: user?.risk_pct ? Number(user.risk_pct) : 1,
    },
  });

  const onSubmit = async (values: UpdateUserSettings) => {
    try {
      await updateSettings(values);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-surface">
      <div className="border-b border-surface-border px-6 py-4">
        <Link href="/dashboard" className="text-xs text-text-muted hover:text-primary">← Dashboard</Link>
        <h1 className="text-lg font-bold text-text-primary mt-1">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-lg">
        <SectionErrorBoundary>
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Account size */}
              <div className="space-y-1.5">
                <label className="text-xs text-text-secondary uppercase tracking-wide">
                  Account size (USD)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 10000"
                  className="w-full bg-surface-card border border-surface-border rounded-xl px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-primary"
                  {...register("account_size", { valueAsNumber: true, min: { value: 100, message: "Minimum $100" } })}
                />
                {errors.account_size && (
                  <p className="text-xs text-signal-sell">{errors.account_size.message}</p>
                )}
                <p className="text-xs text-text-muted">Used to calculate lot sizes on signal cards</p>
              </div>

              {/* Risk % slider */}
              <div className="space-y-2">
                <label className="text-xs text-text-secondary uppercase tracking-wide">
                  Risk per trade
                </label>
                <Controller
                  name="risk_pct"
                  control={control}
                  rules={{ min: 0.5, max: 5 }}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-text-muted">
                        <span>0.5%</span>
                        <span className="text-text-primary font-mono font-bold">{field.value}%</span>
                        <span>5%</span>
                      </div>
                      <input
                        type="range"
                        min={0.5} max={5} step={0.5}
                        value={field.value ?? 1}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </div>
                  )}
                />
                <p className="text-xs text-text-muted">Percentage of account risked per signal</p>
              </div>

              {/* Telegram */}
              <div className="space-y-2 border-t border-surface-border pt-6">
                <p className="text-sm font-medium text-text-primary">Telegram Alerts</p>
                <p className="text-xs text-text-muted">
                  Get instant signal alerts on Telegram for high-confidence signals (≥70%).
                </p>
                <div className="bg-surface-card border border-surface-border rounded-xl p-4 space-y-2">
                  <p className="text-xs text-text-secondary">1. Open Telegram and search for <span className="font-mono text-primary">@APEXSignalsBot</span></p>
                  <p className="text-xs text-text-secondary">2. Send <span className="font-mono text-primary">/start</span> to the bot</p>
                  <p className="text-xs text-text-secondary">3. The bot will link your account automatically</p>
                </div>
              </div>

              <Button type="submit" isLoading={isLoading} className="w-full">
                Save settings
              </Button>
            </form>
          )}
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
