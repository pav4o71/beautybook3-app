import { SiteHeader } from "@/components/site-header";
import { pageTitleClass, pageLeadClass, surfaceClass } from "@/lib/ui";
import { ResetPasswordForm } from "./reset-form";

export default function ResetPasswordPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className={`${surfaceClass} w-full max-w-sm space-y-6 p-6`}>
          <div className="space-y-1">
            <h1 className={pageTitleClass}>Reset password</h1>
            <p className={pageLeadClass}>Choose a new password for your account.</p>
          </div>
          <ResetPasswordForm />
        </div>
      </main>
    </>
  );
}
