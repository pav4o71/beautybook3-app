import { SiteHeader } from "@/components/site-header";
import { pageLeadClass, pageTitleClass, surfaceClass } from "@/lib/ui";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className={`${surfaceClass} w-full max-w-sm space-y-6 p-6`}>
          <div className="space-y-1">
            <h1 className={pageTitleClass}>Sign in</h1>
            <p className={pageLeadClass}>Use the demo account to open BeautyBook.</p>
          </div>
          <LoginForm />
        </div>
      </main>
    </>
  );
}
