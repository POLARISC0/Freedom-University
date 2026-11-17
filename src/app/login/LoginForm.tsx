"use client";

import { useActionState } from "react";
import { signIn, type FormState } from "@/app/actions";
import { USERNAME_RULES } from "@/lib/username";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(signIn, {});
  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-line bg-surface p-6">
      <input type="hidden" name="next" value={next} />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Username</span>
        <input
          name="username"
          required
          autoFocus
          autoComplete="username"
          minLength={3}
          maxLength={24}
          pattern="[A-Za-z0-9_\-]{3,24}"
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-brand"
          placeholder="satoshi_student"
        />
        <span className="block text-xs text-muted">{USERNAME_RULES}</span>
      </label>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-lg bg-brand px-4 py-2 font-medium text-brand-ink disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Enter campus"}
      </button>
    </form>
  );
}
