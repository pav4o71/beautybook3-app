"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  controlClass,
  errorAlertClass,
  labelClass,
  labelTextClass,
  primaryButtonClass,
  textLinkClass,
} from "@/lib/ui";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setPending(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setPending(false);
      return;
    }

    const result = await authClient.signUp.email({
      name,
      email,
      password,
      // After the user clicks the verification link, BA will redirect to this URL
      callbackURL: "/verify-email/confirm",
    });

    setPending(false);

    if (result.error) {
      // Avoid exposing whether the email already exists
      setError(
        result.error.status === 422
          ? "Please check your details and try again."
          : "Could not create account. Please try again.",
      );
      return;
    }

    // Signup succeeded — redirect to "check your email" page
    router.push("/verify-email?signup=1");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className={errorAlertClass}>{error}</p> : null}

      <label className={labelClass}>
        <span className={labelTextClass}>Full name</span>
        <input
          name="name"
          type="text"
          required
          autoComplete="name"
          className={controlClass}
          placeholder="Your full name"
        />
      </label>

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

      <label className={labelClass}>
        <span className={labelTextClass}>Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={controlClass}
          placeholder="At least 8 characters"
        />
      </label>

      <label className={labelClass}>
        <span className={labelTextClass}>Confirm password</span>
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
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className={textLinkClass}>
          Sign in
        </Link>
      </p>
    </form>
  );
}
