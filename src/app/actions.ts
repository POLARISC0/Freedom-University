"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSpecialist } from "@/content";
import { AiRefusalError } from "@/lib/ai";
import { describeApiError, hasAnthropicKey } from "@/lib/anthropic";
import { endSession, getCurrentUser, startSession } from "@/lib/auth";
import { generateBriefing } from "@/lib/briefing";
import { todayUtc } from "@/lib/data";
import { db } from "@/lib/db";
import { forgetStudent } from "@/lib/memory";
import { hasNewsKey, NewsConfigError } from "@/lib/news";
import { normalizeUsername, USERNAME_RULES } from "@/lib/username";

export interface FormState {
  error?: string;
}

/** Only allow redirects back into this site. */
function safeNext(raw: FormDataEntryValue | null): string {
  const next = typeof raw === "string" ? raw : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/floor";
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  if (!username) return { error: `Usernames are ${USERNAME_RULES}` };
  await startSession(username);
  redirect(safeNext(formData.get("next")));
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/");
}

/** Clear what a specialist remembers about the signed-in student. */
export async function forgetMe(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const specialist = getSpecialist(String(formData.get("specialist") ?? ""));
  if (!user || !specialist) return;
  await forgetStudent(user.id, specialist.slug);
  revalidatePath(`/specialists/${specialist.slug}`);
}

// A briefing can be regenerated at most once per hour (GNews free tier allows 100 requests/day).
const REFRESH_INTERVAL_MS = 60 * 60 * 1000;

export async function refreshBriefing(): Promise<FormState> {
  if (!(await getCurrentUser())) return { error: "Please sign in." };
  if (!hasNewsKey()) return { error: "GNEWS_API_KEY is not configured on the server." };
  if (!hasAnthropicKey()) return { error: "ANTHROPIC_API_KEY is not configured on the server." };

  const existing = await db.newsBriefing.findUnique({ where: { day: todayUtc() } });
  const age = existing ? Date.now() - existing.updatedAt.getTime() : Infinity;
  if (age < REFRESH_INTERVAL_MS) {
    return { error: `Today's briefing was just updated. You can refresh it again in ${Math.ceil((REFRESH_INTERVAL_MS - age) / 60000)} min.` };
  }

  try {
    await generateBriefing();
  } catch (error) {
    console.error("briefing failed", error);
    if (error instanceof NewsConfigError || error instanceof AiRefusalError) return { error: error.message };
    if (error instanceof Error && (error.message.startsWith("GNews") || error.message.startsWith("The news service"))) {
      return { error: error.message };
    }
    return { error: describeApiError(error) };
  }
  revalidatePath("/news");
  return {};
}
