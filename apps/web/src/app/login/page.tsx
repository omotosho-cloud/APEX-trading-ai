"use client";

import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useLogin } from "@apex/lib";

type LoginForm = { email: string; password: string };

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const { login } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();

  const onSubmit = async (values: LoginForm) => {
    try {
      await login(values.email, values.password);
      await new Promise((r) => setTimeout(r, 100));
      router.push(redirect);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <label className="text-xs text-text-secondary uppercase tracking-wide">Email</label>
        <input
          type="email"
          autoComplete="email"
          className="w-full bg-surface-card border border-surface-border rounded-card px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary"
          {...register("email", { required: "Email is required" })}
        />
        {errors.email && <p className="text-xs text-signal-sell">{errors.email.message}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-xs text-text-secondary uppercase tracking-wide">Password</label>
        <input
          type="password"
          autoComplete="current-password"
          className="w-full bg-surface-card border border-surface-border rounded-card px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary"
          {...register("password", { required: "Password is required" })}
        />
        {errors.password && <p className="text-xs text-signal-sell">{errors.password.message}</p>}
      </div>

      <div className="text-right">
        <Link href="/forgot-password" className="text-xs text-primary hover:underline">
          Forgot password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-medium py-2 rounded-card text-sm transition-colors"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-text-primary">APEX</h1>
          <p className="text-text-secondary text-sm">Sign in to your account</p>
        </div>
        <Suspense fallback={<div className="h-40" />}>
          <LoginForm />
        </Suspense>
        <p className="text-center text-xs text-text-secondary">
          No account?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Create one free
          </Link>
        </p>
      </div>
    </main>
  );
}
