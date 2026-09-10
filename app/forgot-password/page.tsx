import { SiteHeader } from "@/components/site-header";
import { pageTitleClass, pageLeadClass, surfaceClass } from "@/lib/ui";
import { ForgotPasswordForm } from "./forgot-form";

export default function ForgotPasswordPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className={`${surfaceClass} w-full max-w-sm space-y-6 p-6`}>
          <div className="space-y-1">
            <h1 className={pageTitleClass}>Forgot password?</h1>
            <p className={pageLeadClass}>
              Enter your email address and we&apos;ll send you a reset link.
            </p>
          </div>
          <ForgotPasswordForm />
        </div>
      </main>
    </>
  );
}
