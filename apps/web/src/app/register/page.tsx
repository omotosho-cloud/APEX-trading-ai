"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useState } from "react";
import { useRegister } from "@apex/lib";

type RegisterForm = {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useRegister();
  const [confirmed, setConfirmed] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>();

  const onSubmit = async (values: RegisterForm) => {
    try {
      await registerUser(values.email, values.password, values.full_name);
      setConfirmed(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    }
  };

  if (confirmed) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-4xl">✉️</div>
          <h2 className="text-xl font-bold text-text-primary">Check your email</h2>
          <p className="text-text-secondary text-sm">
            We sent a confirmation link to your email. Click it to activate your account, then{" "}
            <button onClick={() => router.push("/login")} className="text-primary hover:underline">
              sign in
            </button>
            .
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-text-primary">APEX</h1>
          <p className="text-text-secondary text-sm">Create your free account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-text-secondary uppercase tracking-wide">Full name</label>
            <input
              type="text"
              autoComplete="name"
              className="w-full bg-surface-card border border-surface-border rounded-card px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary"
              {...register("full_name", { required: "Full name is required" })}
            />
            {errors.full_name && (
              <p className="text-xs text-signal-sell">{errors.full_name.message}</p>
            )}
          </div>

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

          <div className="space-y-1">
            <label className="text-xs text-text-secondary uppercase tracking-wide">Password</label>
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
            {isSubmitting ? "Creating account…" : "Create account — 7 days free"}
          </button>
        </form>

        <p className="text-center text-xs text-text-muted">
          By registering you agree to our terms. No card required for trial.
        </p>

        <p className="text-center text-xs text-text-secondary">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
