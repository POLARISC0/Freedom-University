"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signInWithPassword } from "@/lib/auth";
import { isAcceptablePassword, PASSWORD_RULES } from "@/lib/password-rules";
import { clearRateLimit, hit, isLimited } from "@/lib/rate-limit";
import { safeRedirectPath } from "@/lib/redirect";
import { normalizeUsername, USERNAME_RULES } from "@/lib/username";

export interface FormState {
  error?: string;
  /** Echoed back so the sign-in form keeps the username after React resets it. */
  username?: string;
}

// Failed sign-ins allowed per username and per client address before a cool-down.
const SIGN_IN_FAILURES = 8;
const SIGN_IN_WINDOW_MS = 15 * 60 * 1000;
// New accounts per client address per hour.
const SIGN_UPS_PER_HOUR = 10;

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const typed = String(formData.get("username") ?? "").slice(0, 64);
  const username = normalizeUsername(typed);
  if (!username) return { error: `Usernames are ${USERNAME_RULES}`, username: typed };
  const password = String(formData.get("password") ?? "");
  if (!isAcceptablePassword(password)) return { error: `Passwords need to be ${PASSWORD_RULES.toLowerCase()}`, username };
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const userKey = `signin:user:${username}`;
  const ipKey = `signin:ip:${ip}`;
  if (isLimited(userKey, SIGN_IN_FAILURES, SIGN_IN_WINDOW_MS) || isLimited(ipKey, SIGN_IN_FAILURES * 3, SIGN_IN_WINDOW_MS)) {
    return { error: "Too many attempts. Please wait 15 minutes and try again.", username };
  }
  const result = await signInWithPassword(username, password, () => hit(`signup:ip:${ip}`, SIGN_UPS_PER_HOUR, 60 * 60 * 1000));
  if (!result.ok) {
    hit(userKey, SIGN_IN_FAILURES, SIGN_IN_WINDOW_MS);
    hit(ipKey, SIGN_IN_FAILURES * 3, SIGN_IN_WINDOW_MS);
    return { error: result.error, username };
  }
  clearRateLimit(userKey);
  redirect(safeRedirectPath(formData.get("next"), "/walk/play"));
}
