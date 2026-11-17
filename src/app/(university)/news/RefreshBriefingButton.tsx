"use client";

import { useActionState } from "react";
import { refreshBriefing, type FormState } from "@/app/actions";

export function RefreshBriefingButton({ label }: { label: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(refreshBriefing, {});
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <button disabled={pending} className="rounded-lg bg-brand px-4 py-2 font-medium text-brand-ink disabled:opacity-60">
        {pending ? "Reading the news…" : label}
      </button>
      {state.error && <p className="max-w-xs text-right text-sm text-danger">{state.error}</p>}
    </form>
  );
}
