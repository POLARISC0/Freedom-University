"use client";

import { useActionState } from "react";
import { signIn, type FormState } from "@/app/actions";
import { PASSWORD_RULES } from "@/lib/password-rules";
import { USERNAME_RULES } from "@/lib/username";

export function LoginForm({
  next,
  submitLabel = "Enter campus",
  usernamePlaceholder = "satoshi_student",
}: {
  next: string;
  submitLabel?: string;
  usernamePlaceholder?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(signIn, {});
  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-line bg-surface p-6">
      <input type="hidden" name="next" value={next} />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Username</span>
        <input
          name="username"
          defaultValue={state.username}
          required
          autoFocus
          autoComplete="username"
          minLength={3}
          maxLength={24}
          pattern="[A-Za-z0-9_\-]{3,24}"
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-brand"
          placeholder={usernamePlaceholder}
        />
        <span className="block text-xs text-muted">{USERNAME_RULES}</span>
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          minLength={8}
          maxLength={200}
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-brand"
        />
        <span className="block text-xs text-muted">{PASSWORD_RULES} New usernames create an account with this password.</span>
      </label>
      {state.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-lg bg-brand px-4 py-2 font-medium text-brand-ink disabled:opacity-60"
      >
        {pending ? "Signing in…" : submitLabel}
      </button>
    </form>
  );
}
