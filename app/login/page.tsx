import { SiteHeader } from "@/components/site-header";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Sign in</h1>
            <p className="text-sm text-zinc-600">
              Use the demo account to open BeautyBook.
            </p>
          </div>
          <LoginForm />
        </div>
      </main>
    </>
  );
}
