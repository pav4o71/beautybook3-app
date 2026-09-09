"use client";

import { useActionState } from "react";
import type { ActionFormState } from "@/lib/action-form-state";
import { errorAlertClass } from "@/lib/ui";

export type { ActionFormState };

export function ActionForm({
  action,
  children,
  className,
}: {
  action: (
    prevState: ActionFormState,
    formData: FormData,
  ) => Promise<ActionFormState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className={className}>
      {state.error ? (
        <p className={`mb-4 ${errorAlertClass}`}>{state.error}</p>
      ) : null}
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
