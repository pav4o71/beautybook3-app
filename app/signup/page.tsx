import { SiteHeader } from "@/components/site-header";
import { pageLeadClass, pageTitleClass, surfaceClass } from "@/lib/ui";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className={`${surfaceClass} w-full max-w-sm space-y-6 p-6`}>
          <div className="space-y-1">
            <h1 className={pageTitleClass}>Create account</h1>
            <p className={pageLeadClass}>
              Book beauty appointments and manage your history.
            </p>
          </div>
          <SignupForm />
        </div>
      </main>
    </>
  );
}
