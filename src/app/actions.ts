"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { NEWS_PROFESSOR } from "@/content";
import { AiRefusalError, writeNewsBriefing } from "@/lib/ai";
import { describeApiError, hasAnthropicKey } from "@/lib/anthropic";
import { endSession, getCurrentUser, signInWithPassword } from "@/lib/auth";
import { todayUtc } from "@/lib/data";
import { db } from "@/lib/db";
import { fetchHeadlines, hasNewsKey, NewsConfigError } from "@/lib/news";
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
  redirect(safeRedirectPath(formData.get("next"), "/dashboard"));
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/");
}

// A briefing can be regenerated at most once per hour (GNews free tier allows 100 requests/day).
const REFRESH_INTERVAL_MS = 60 * 60 * 1000;

export async function refreshBriefing(): Promise<FormState> {
  if (!(await getCurrentUser())) return { error: "Please sign in." };
  if (!hasNewsKey()) return { error: "GNEWS_API_KEY is not configured on the server." };
  if (!hasAnthropicKey()) return { error: "ANTHROPIC_API_KEY is not configured on the server." };

  const day = todayUtc();
  const existing = await db.newsBriefing.findUnique({ where: { day } });
  if (existing && Date.now() - existing.updatedAt.getTime() < REFRESH_INTERVAL_MS) {
    const minutes = Math.ceil((REFRESH_INTERVAL_MS - (Date.now() - existing.updatedAt.getTime())) / 60000);
    return { error: `Today's briefing was just updated. You can refresh it again in ${minutes} min.` };
  }

  try {
    const headlines = (await fetchHeadlines()).slice(0, 16);
    if (headlines.length === 0) return { error: "The news service returned no headlines. Try again later." };
    const summary = await writeNewsBriefing({ professor: NEWS_PROFESSOR, today: day, headlines });
    await db.newsBriefing.upsert({
      where: { day },
      create: { day, headlines: JSON.parse(JSON.stringify(headlines)), summary },
      update: { headlines: JSON.parse(JSON.stringify(headlines)), summary },
    });
  } catch (error) {
    console.error("briefing failed", error);
    if (error instanceof NewsConfigError || error instanceof AiRefusalError) return { error: error.message };
    if (error instanceof Error && error.message.startsWith("GNews")) return { error: error.message };
    return { error: describeApiError(error) };
  }
  revalidatePath("/news");
  return {};
}
