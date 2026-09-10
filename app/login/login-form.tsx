"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { signIn } from "@/lib/auth-client";
import { DEMO_ACCOUNT } from "@/lib/demo-account";
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

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justReset = searchParams.get("reset") === "1";

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const result = await signIn.email({ email, password });

    setPending(false);

    if (result.error) {
      // Better Auth returns a specific error for unverified email when
      // requireEmailVerification is enabled.
      const code = result.error.code;
      if (code === "EMAIL_NOT_VERIFIED") {
        setError(
          "Please verify your email address before signing in. Check your inbox for the verification link.",
        );
        return;
      }
      setError(result.error.message || "Could not sign in.");
      return;
    }

    // Determine destination based on whether user has org memberships.
    // The dashboard page itself will redirect zero-org customers to /account.
    const redirectTo = searchParams.get("redirectTo");

    if (redirectTo && redirectTo.startsWith("/")) {
      router.push(redirectTo);
      router.refresh();
      return;
    }

    // Default redirect: go to /dashboard — the dashboard page itself handles
    // customers with zero org memberships gracefully (shows the dashboard landing).
    // For a cleaner UX, server-side routing will eventually detect zero-org and
    // redirect to /account, but we use /dashboard as the stable post-login target.
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {justReset ? (
        <p className={successAlertClass}>
          Password reset successfully. Please sign in with your new password.
        </p>
      ) : null}
      {error ? <p className={errorAlertClass}>{error}</p> : null}

      <label className={labelClass}>
        <span className={labelTextClass}>Email</span>
        <input
          name="email"
          type="email"
          required
          defaultValue={DEMO_ACCOUNT.email}
          autoComplete="email"
          className={controlClass}
        />
      </label>

      <label className={labelClass}>
        <span className={labelTextClass}>Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          defaultValue={DEMO_ACCOUNT.password}
          autoComplete="current-password"
          className={controlClass}
        />
      </label>

      <div className="flex justify-end">
        <Link href="/forgot-password" className={textLinkClass}>
          Forgot password?
        </Link>
      </div>

      <button type="submit" disabled={pending} className={`w-full ${primaryButtonClass}`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className={textLinkClass}>
          Create account
        </Link>
      </p>

      {process.env.NODE_ENV !== "production" ? (
        <p className={infoAlertClass}>
          Demo: {DEMO_ACCOUNT.email} / {DEMO_ACCOUNT.password}
        </p>
      ) : null}
    </form>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <LoginFormInner />
    </Suspense>
  );
}
