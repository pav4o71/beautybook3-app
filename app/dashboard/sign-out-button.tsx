"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/auth-client";
import { secondaryButtonClass } from "@/lib/ui";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending ? true : undefined}
      onClick={async () => {
        if (pending) {
          return;
        }
        setPending(true);
        try {
          await signOut();
          router.push("/login");
          router.refresh();
        } catch {
          setPending(false);
        }
      }}
      className={secondaryButtonClass}
    >
      Sign out
    </button>
  );
}
