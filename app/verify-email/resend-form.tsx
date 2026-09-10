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
  successAlertClass,
  textLinkClass,
} from "@/lib/ui";

export function ResendVerificationForm({ email }: { email?: string }) {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [pending, setPending] = useState(false);
  const [inputEmail, setInputEmail] = useState(email ?? "");

  async function handleResend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus("idle");

    const result = await authClient.sendVerificationEmail({
      email: inputEmail.trim(),
      callbackURL: "/verify-email/confirm",
    });

    setPending(false);

    if (result.error) {
      setStatus("error");
    } else {
      setStatus("success");
    }
  }

  return (
    <div className="space-y-4">
      {status === "success" ? (
        <p className={successAlertClass}>
          Verification email sent. Please check your inbox.
        </p>
      ) : null}
      {status === "error" ? (
        <p className={errorAlertClass}>
          Could not send verification email. Please try again shortly.
        </p>
      ) : null}

      <form onSubmit={handleResend} className="space-y-3">
        <label className={labelClass}>
          <span className={labelTextClass}>Email</span>
          <input
            type="email"
            required
            value={inputEmail}
            onChange={(e) => setInputEmail(e.target.value)}
            autoComplete="email"
            className={controlClass}
            placeholder="you@example.com"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className={`w-full ${primaryButtonClass}`}
        >
          {pending ? "Sending…" : "Resend verification email"}
        </button>
      </form>

      <p className={infoAlertClass}>
        Didn&apos;t get the email? Check your spam folder or use the form above to resend.
      </p>

      <p className="text-center text-sm text-zinc-500">
        <Link href="/login" className={textLinkClass}>
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
