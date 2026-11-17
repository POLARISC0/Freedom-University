import type { ActionResult } from "@/app/walk/actions";

/** Call a server action without letting a network failure or a stale deploy crash the page. */
export async function safely<T>(call: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await call();
  } catch (error) {
    console.error("server action failed", error);
    return { ok: false, error: "Couldn't reach the server. Check your connection and try again." };
  }
}
