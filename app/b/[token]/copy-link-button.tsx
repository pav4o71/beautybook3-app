"use client";

import { useState } from "react";
import { secondaryButtonClass } from "@/lib/ui";

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      if (typeof window !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href.split("?")[0]);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch {
      // Fallback if clipboard API is restricted in browser context
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid="copy-management-link"
      className={secondaryButtonClass}
      aria-live="polite"
    >
      {copied ? "Link copied!" : "Copy management link"}
    </button>
  );
}
