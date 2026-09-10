import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { pageTitleClass, pageLeadClass, surfaceClass, primaryButtonClass } from "@/lib/ui";

export default async function VerifyEmailConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const hasError = Boolean(params.error);

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className={`${surfaceClass} w-full max-w-sm space-y-6 p-6 text-center`}>
          {hasError ? (
            <>
              <div className="text-4xl">⚠️</div>
              <h1 className={pageTitleClass}>Verification failed</h1>
              <p className={pageLeadClass}>
                This verification link is invalid, expired, or has already been used.
              </p>
              <Link href="/verify-email" className={`${primaryButtonClass} mt-2`}>
                Request a new link
              </Link>
            </>
          ) : (
            <>
              <div className="text-4xl">✅</div>
              <h1 className={pageTitleClass}>Email verified!</h1>
              <p className={pageLeadClass}>
                Your email address has been verified. You can now sign in to your
                BeautyBook account.
              </p>
              <Link href="/login" className={`${primaryButtonClass} mt-2`}>
                Sign in
              </Link>
            </>
          )}
        </div>
      </main>
    </>
  );
}
