"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  controlClass,
  errorAlertClass,
  infoAlertClass,
  labelClass,
  labelTextClass,
  primaryButtonClass,
  textLinkClass,
} from "@/lib/ui";

function ResetPasswordFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const hasError = searchParams.get("error") === "INVALID_TOKEN";

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (hasError || !token) {
    return (
      <div className="space-y-4">
        <p className={errorAlertClass}>
          This password reset link is invalid, expired, or has already been used.
          Please request a new one.
        </p>
        <Link href="/forgot-password" className={`${primaryButtonClass} block w-full text-center`}>
          Request new reset link
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setPending(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      setPending(false);
      return;
    }

    const result = await authClient.resetPassword({
      newPassword,
      token: token!,
    });

    setPending(false);

    if (result.error) {
      if (result.error.status === 400 || result.error.status === 401) {
        setError("This reset link is invalid or has expired. Please request a new one.");
      } else {
        setError("Could not reset password. Please try again.");
      }
      return;
    }

    // Password reset succeeded — BA revokes all sessions; redirect to login
    router.push("/login?reset=1");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className={errorAlertClass}>{error}</p> : null}

      <p className={infoAlertClass}>
        After resetting, all existing sessions will be signed out.
      </p>

      <label className={labelClass}>
        <span className={labelTextClass}>New password</span>
        <input
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={controlClass}
          placeholder="At least 8 characters"
        />
      </label>

      <label className={labelClass}>
        <span className={labelTextClass}>Confirm new password</span>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={controlClass}
        />
      </label>

      <button type="submit" disabled={pending} className={`w-full ${primaryButtonClass}`}>
        {pending ? "Resetting…" : "Reset password"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        <Link href="/login" className={textLinkClass}>
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-zinc-500">Loading…</p>
      }
    >
      <ResetPasswordFormInner />
    </Suspense>
  );
}
