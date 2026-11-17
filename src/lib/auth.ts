import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { hashPassword, verifyPassword } from "./password";

export const SESSION_COOKIE = "walk_session";
const SESSION_DAYS = 30;

export interface CurrentUser {
  id: string;
  username: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type SignInResult = { ok: true } | { ok: false; error: string };

/** Sign in with a username and password. New usernames create an account with that password. */
export async function signInWithPassword(
  username: string,
  password: string,
  /** Called before creating a new account; return false to refuse (rate limiting). */
  allowSignUp: () => boolean = () => true,
): Promise<SignInResult> {
  const existing = await db.user.findUnique({ where: { username } });
  let userId: string;
  if (!existing) {
    if (!allowSignUp()) return { ok: false, error: "Too many new accounts from here. Please try again later." };
    try {
      const created = await db.user.create({ data: { username, passwordHash: await hashPassword(password) } });
      userId = created.id;
    } catch {
      // Someone else took the username a moment ago.
      return { ok: false, error: "That username was just taken. Please try again." };
    }
  } else {
    if (!(await verifyPassword(password, existing.passwordHash))) {
      return { ok: false, error: "That username and password don't match." };
    }
    userId = existing.id;
  }
  await startSession(userId);
  return { ok: true };
}

async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  jar.delete(SESSION_COOKIE);
}

/** The signed-in player for this request, or null. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, username: true } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
});

/** For pages: send signed-out visitors to the sign-in page, which brings them back to `nextPath`. */
export async function requireUser(nextPath: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/walk/begin?next=${encodeURIComponent(nextPath)}`);
  return user;
}
