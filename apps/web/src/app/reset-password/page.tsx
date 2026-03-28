"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { supabaseClient } from "@apex/lib";

type ResetForm = { password: string; confirm_password: string };

export default function ResetPasswordPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>();

  const onSubmit = async (values: ResetForm) => {
    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: values.password,
      });
      if (error) throw new Error(error.message);
      toast.success("Password updated. Please sign in.");
      router.push("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-text-primary">New password</h1>
          <p className="text-text-secondary text-sm">Choose a new password for your account.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-text-secondary uppercase tracking-wide">
              New password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full bg-surface-card border border-surface-border rounded-card px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary"
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "Minimum 8 characters" },
              })}
            />
            {errors.password && (
              <p className="text-xs text-signal-sell">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-text-secondary uppercase tracking-wide">
              Confirm password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              className="w-full bg-surface-card border border-surface-border rounded-card px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary"
              {...register("confirm_password", {
                required: "Please confirm your password",
                validate: (v) => v === watch("password") || "Passwords do not match",
              })}
            />
            {errors.confirm_password && (
              <p className="text-xs text-signal-sell">{errors.confirm_password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-medium py-2 rounded-card text-sm transition-colors"
          >
            {isSubmitting ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}
