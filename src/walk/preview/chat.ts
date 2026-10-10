import { buildCharacterSystemPrompt, concernNote } from "@/walk/ai/prompts";
import { HISTORY_LIMIT, refusalNote, resolveThread } from "@/walk/ai/threads";
import { LESSONS } from "@/walk/content";
import { detectConcerns } from "@/walk/safety/concern";
import { isCapabilityError, getCapability, type Sample, type SampleTurn } from "./capabilities";
import { activeStore, current, newId, persist } from "./session";
import type { ChatMessage } from "./store";

// The static preview's stand-in for `/api/walk/chat`. ChatPanel talks to that route with fetch, so the preview
// answers those requests in the page: the same thread rules, the same character prompts and crisis notes, with
// Claude reached through the artifact's `sample` capability on the viewer's own account. There is no system
// prompt there, so the character prompt leads the conversation as an opening instruction turn.

const ROUTE = "/api/walk/chat";
/** Messages shown when a conversation is reopened, and kept per thread. */
const SHOWN = 40;
const KEPT = 60;

const UNAVAILABLE =
  "Conversations with the characters need Claude, which this copy of the page can't reach. Open it on claude.ai, signed in, to talk with them. Everything else in the game works here.";
const DECLINED =
  "Conversations need your permission to use Claude, which wasn't given. Reload the page if you'd like to be asked again. Everything else in the game works without it.";
const DISABLED =
  "Conversations need Claude, which isn't available to your account here. Everything else in the game works without it.";
const INTERRUPTED = "The conversation was interrupted. Try again in a moment.";
const RATE_LIMITED = "You've reached your Claude usage limit for now. Take a break, open your Bible, and come back later.";
const SIGNED_OUT = "Sign in to claude.ai again to keep talking.";

/** Errors that mean Claude can't be used in this view at all: conversations are hidden for the rest of it. */
const HIDING = new Map([
  ["not_granted", DECLINED],
  ["sampling_disabled", DISABLED],
  ["not_declared", DISABLED],
  ["capability_disabled", DISABLED],
  ["capability_removed", DISABLED],
]);

let samplePromise: Promise<Sample | null> | null = null;
/** Set once Claude turns out to be unusable here; the reason is shown in every conversation. */
let unavailable: string | null = null;
const threads = new Map<string, ChatMessage[]>();

function getSample() {
  samplePromise ??= getCapability<Sample>("sample");
  return samplePromise;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function abortError() {
  return new DOMException("The operation was aborted.", "AbortError");
}

async function loadThread(key: string): Promise<ChatMessage[]> {
  const cached = threads.get(key);
  if (cached) return cached;
  const messages = (await activeStore()?.loadThread(key).catch(() => [])) ?? [];
  threads.set(key, messages);
  return messages;
}

function saveExchange(key: string, message: string, reply: string) {
  const messages = [
    ...(threads.get(key) ?? []),
    { id: newId(), role: "user" as const, content: message },
    { id: newId(), role: "assistant" as const, content: reply },
  ].slice(-KEPT);
  threads.set(key, messages);
  persist((s) => s.saveThread(key, messages));
}

async function handleGet(params: URLSearchParams): Promise<Response> {
  const resolved = resolveThread(params.get("characterId") ?? "", params.get("lessonSlug") || undefined);
  if ("error" in resolved) return json({ error: resolved.error }, 404);
  const [messages, sample] = await Promise.all([loadThread(`${resolved.character.id}:${resolved.thread}`), getSample()]);
  const note = sample ? unavailable : UNAVAILABLE;
  return json({ messages: messages.slice(-SHOWN), aiConfigured: !note, ...(note ? { aiNote: note } : {}) });
}

async function handlePost(rawBody: unknown, signal: AbortSignal | undefined): Promise<Response> {
  let body: { characterId?: unknown; lessonSlug?: unknown; message?: unknown } = {};
  try {
    body = typeof rawBody === "string" ? JSON.parse(rawBody) : {};
  } catch {
    // Treated as an empty message below.
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 2000) return json({ error: "Messages can be up to 2,000 characters." }, 400);
  const resolved = resolveThread(
    String(body.characterId ?? ""),
    typeof body.lessonSlug === "string" && body.lessonSlug ? body.lessonSlug : undefined,
  );
  if ("error" in resolved) return json({ error: resolved.error }, 404);
  const { character, lesson, thread } = resolved;

  const sample = await getSample();
  if (!sample || unavailable) return json({ error: unavailable ?? UNAVAILABLE }, 503);

  const key = `${character.id}:${thread}`;
  const history: SampleTurn[] = (await loadThread(key))
    .slice(-HISTORY_LIMIT)
    .map((m) => ({ role: m.role, content: m.content }));
  while (history[0]?.role === "assistant") history.shift();

  const progress = current().progress;
  const instructions = [
    buildCharacterSystemPrompt({
      character,
      lesson,
      playerName: "friend",
      completedLessons: LESSONS.filter((l) => progress[l.slug]?.status === "completed").map((l) => l.title),
    }),
  ];
  const concerns = detectConcerns(message);
  if (concerns.length) instructions.push(concernNote(concerns));
  instructions.push(
    `---\nEverything above is your role and your rules. Your conversation with the player follows, ending with their newest message. Reply to that message only, as ${character.shortName}.`,
  );
  const turns: SampleTurn[] = [{ role: "user", content: instructions.join("\n\n") }, ...history, { role: "user", content: message }];

  if (signal?.aborted) throw abortError();
  const call = new AbortController();
  signal?.addEventListener("abort", () => call.abort(), { once: true });
  const encoder = new TextEncoder();
  let output!: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      output = controller;
    },
    cancel() {
      call.abort();
    },
  });
  const streaming = () =>
    new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

  // The Response is handed back once the first words arrive (or the call fails first), so a failure that happens
  // before any text can still answer with a status ChatPanel understands.
  return new Promise<Response>((resolve, reject) => {
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      resolve(streaming());
    };

    sample(turns, {
      modelTier: "default",
      cache: false,
      signal: call.signal,
      onText: ({ delta }) => {
        start();
        output.enqueue(encoder.encode(delta));
      },
    }).then(
      ({ text }) => {
        if (!started) {
          start();
          output.enqueue(encoder.encode(text));
        }
        output.close();
        if (text.trim()) saveExchange(key, message, text);
      },
      (error: unknown) => {
        const code = isCapabilityError(error) ? error.code : "upstream_error";
        if (code === "cancelled" || call.signal.aborted) {
          if (started) output.error(abortError());
          else reject(abortError());
          return;
        }
        const hidden = HIDING.get(code);
        if (hidden) unavailable = hidden;
        if (code === "refused") {
          // A refused answer is withdrawn: ChatPanel takes the partial reply off the screen.
          const withdrawn = Object.assign(new Error(refusalNote(character.shortName)), { name: "WithdrawnReply" });
          if (started) output.error(withdrawn);
          else resolve(json({ error: withdrawn.message }, 422));
          return;
        }
        const text =
          hidden ??
          (code === "rate_limited"
            ? RATE_LIMITED
            : code === "session_expired"
              ? SIGNED_OUT
              : code === "empty_completion"
                ? `${character.shortName} didn't answer that time. Try asking another way.`
                : INTERRUPTED);
        if (!started) {
          resolve(json({ error: text }, hidden ? 503 : code === "rate_limited" ? 429 : 502));
          return;
        }
        output.enqueue(encoder.encode(`\n\n⚠️ ${text}`));
        output.close();
      },
    );
  });
}

/** Route ChatPanel's requests to `/api/walk/chat` into the page; every other request goes out as usual. */
export function installChatRoute() {
  const passThrough = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, "https://walk.invalid");
    if (url.pathname !== ROUTE) return passThrough(input, init);
    const signal = init?.signal ?? undefined;
    const method = (init?.method ?? "GET").toUpperCase();
    const response = method === "POST" ? await handlePost(init?.body, signal) : await handleGet(url.searchParams);
    // ChatPanel drops a conversation it has moved away from; don't hand it a stale answer.
    if (signal?.aborted) throw abortError();
    return response;
  };
}
