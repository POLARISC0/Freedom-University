import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic();

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

// Server-side refusal fallback: if a safety classifier declines a request, the
// API re-runs it on Anthropic's recommended fallback model in the same call.
// Only send it to models that accept the "default" form.
const FALLBACK_MODELS = new Set([
  "claude-fable-5-1",
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-sonnet-5-5",
]);

export function fallbackParams(): { betas?: ["server-side-fallback-2026-07-01"]; fallbacks?: "default" } {
  return FALLBACK_MODELS.has(MODEL)
    ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }
    : {};
}

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

/** A short, student-facing message for an API failure. `who` names the AI voices, e.g. "The mentors". */
export function describeApiError(error: unknown, who = "The professors"): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return `${who} are not configured: check ANTHROPIC_API_KEY.`;
  }
  if (error instanceof Anthropic.RateLimitError) {
    return `${who} are busy right now (rate limited). Please try again in a minute.`;
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "Could not reach the AI service. Check your connection and try again.";
  }
  if (error instanceof Anthropic.APIError) {
    return `The AI service returned an error (${error.status ?? "unknown"}). Please try again.`;
  }
  return "Something went wrong. Please try again.";
}
