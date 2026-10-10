export const USERNAME_RULES = "3–24 characters: letters, numbers, hyphens or underscores.";

/** Usernames are case-insensitive; returns the canonical form or null if invalid. */
export function normalizeUsername(raw: string): string | null {
  const username = raw.trim().toLowerCase();
  return /^[a-z0-9_-]{3,24}$/.test(username) ? username : null;
}
