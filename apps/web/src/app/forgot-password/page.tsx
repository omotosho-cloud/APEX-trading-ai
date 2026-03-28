"use client";

import { useForm } from "react-hook-form";
import Link from "next/link";
import toast from "react-hot-toast";
import { useState } from "react";
import { useResetPassword } from "@apex/lib";

type ForgotForm = { email: string };

export default function ForgotPasswordPage() {
  const { sendReset } = useResetPassword();
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>();

  const onSubmit = async (values: ForgotForm) => {
    try {
      await sendReset(values.email);
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reset email");
    }
  };

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-4xl">✉️</div>
          <h2 className="text-xl font-bold text-text-primary">Reset link sent</h2>
          <p className="text-text-secondary text-sm">
            Check your email for a password reset link.
          </p>
          <Link href="/login" className="text-primary text-sm hover:underline block">
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-text-primary">Reset password</h1>
          <p className="text-text-secondary text-sm">
            Enter your email and we'll send a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-text-secondary uppercase tracking-wide">Email</label>
            <input
              type="email"
              autoComplete="email"
              className="w-full bg-surface-card border border-surface-border rounded-card px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary"
              {...register("email", { required: "Email is required" })}
            />
            {errors.email && (
              <p className="text-xs text-signal-sell">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-medium py-2 rounded-card text-sm transition-colors"
          >
            {isSubmitting ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="text-center text-xs text-text-secondary">
          <Link href="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
