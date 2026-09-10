"use client";

import Link from "next/link";
import { useState } from "react";
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

export function ForgotPasswordForm() {
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus("idle");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    // Always show the same "sent" message regardless of whether the account exists.
    // This prevents account enumeration.
    await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    }).catch(() => {
      // Suppress errors to avoid enumeration — always show generic message
    });

    setPending(false);
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="space-y-4">
        <p className={infoAlertClass}>
          If an account exists for that email, we&apos;ve sent password reset instructions.
          Please check your inbox (and spam folder).
        </p>
        <p className="text-center text-sm text-zinc-500">
          <Link href="/login" className={textLinkClass}>
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {status === "error" ? (
        <p className={errorAlertClass}>
          If an account exists for that email, we&apos;ve sent password reset instructions.
        </p>
      ) : null}

      <label className={labelClass}>
        <span className={labelTextClass}>Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={controlClass}
          placeholder="you@example.com"
        />
      </label>

      <button type="submit" disabled={pending} className={`w-full ${primaryButtonClass}`}>
        {pending ? "Sending…" : "Send reset instructions"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        Remember your password?{" "}
        <Link href="/login" className={textLinkClass}>
          Sign in
        </Link>
      </p>
    </form>
  );
}
