import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { pageTitleClass, pageLeadClass, surfaceClass, textLinkClass } from "@/lib/ui";
import { ResendVerificationForm } from "./resend-form";

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ signup?: string; email?: string }>;
}) {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className={`${surfaceClass} w-full max-w-sm space-y-6 p-6`}>
          <div className="space-y-1">
            <div className="mb-3 text-4xl">📬</div>
            <h1 className={pageTitleClass}>Check your email</h1>
            <p className={pageLeadClass}>
              We sent a verification link to your email address. Click the link
              in the email to activate your BeautyBook account.
            </p>
          </div>

          <ResendVerificationFormWrapper searchParams={searchParams} />

          <p className="text-center text-sm text-zinc-500">
            Already verified?{" "}
            <Link href="/login" className={textLinkClass}>
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}

async function ResendVerificationFormWrapper({
  searchParams,
}: {
  searchParams: Promise<{ signup?: string; email?: string }>;
}) {
  const params = await searchParams;
  return <ResendVerificationForm email={params.email} />;
}
