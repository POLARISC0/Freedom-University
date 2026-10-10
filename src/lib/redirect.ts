/**
 * Only allow redirects to a path on this site. Rejects protocol-relative ("//evil.com") and backslash
 * ("/\evil.com") forms, which browsers treat as other hosts.
 */
export function safeRedirectPath(next: unknown, fallback: string): string {
  if (typeof next !== "string" || !next.startsWith("/")) return fallback;
  if (/[\\\u0000-\u001f]/.test(next)) return fallback;
  try {
    const base = "https://this.site";
    const url = new URL(next, base);
    return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}
