"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { DEMO_ACCOUNT } from "@/lib/demo-account";
import {
  controlClass,
  errorAlertClass,
  labelClass,
  labelTextClass,
  primaryButtonClass,
} from "@/lib/ui";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn.email({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    setPending(false);

    if (result.error) {
      setError(result.error.message || "Could not sign in.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <button type="submit" disabled={pending} className={`w-full ${primaryButtonClass}`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>

      {process.env.NODE_ENV !== "production" ? (
        <p className="rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
          Demo account: {DEMO_ACCOUNT.email} / {DEMO_ACCOUNT.password}
        </p>
      ) : null}
    </form>
  );
}
