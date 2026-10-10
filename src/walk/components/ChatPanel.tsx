"use client";

import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import type { Character } from "@/walk/content";
import { detectConcerns } from "@/walk/safety/concern";
import { linkScriptureReferences, uniqueReferences } from "@/walk/scripture/references";
import { HelpCard } from "./HelpCard";
import { Portrait } from "./Portrait";
import { RefChips } from "./Scripture";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/**
 * A conversation with an AI character. `lessonSlug` scopes it to a lesson (so the character knows what it is
 * teaching); without one it's a free conversation.
 */
export function ChatPanel({
  character,
  lessonSlug,
  intro,
  suggestions,
}: {
  character: Character;
  lessonSlug?: string;
  intro?: string;
  suggestions: string[];
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(true);
  // Why conversations are unavailable, when whatever serves them says so.
  const [aiNote, setAiNote] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ characterId: character.id });
    if (lessonSlug) params.set("lessonSlug", lessonSlug);
    fetch(`/api/walk/chat?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((body: { messages?: Message[]; aiConfigured?: boolean; aiNote?: string; error?: string }) => {
        if (body.error) setError(body.error);
        setMessages(body.messages ?? []);
        setAiConfigured(body.aiConfigured !== false);
        if (body.aiNote) setAiNote(body.aiNote);
        setLoaded(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoaded(true);
      });
    return () => {
      controller.abort();
      abortRef.current?.abort();
    };
  }, [character.id, lessonSlug]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || streaming) return;
    setError(null);
    setInput("");
    const replyId = `reply-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: `me-${Date.now()}`, role: "user", content: message },
      { id: replyId, role: "assistant", content: "" },
    ]);
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/walk/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: character.id, lessonSlug, message }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 503) {
          setAiConfigured(false);
          if (body.error) setAiNote(body.error);
          setMessages((prev) => prev.filter((m) => m.id !== replyId));
          return;
        }
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, content: m.content + chunk } : m)));
      }
    } catch (err) {
      // A reply that was withdrawn mid-stream (a refusal) comes off the screen; otherwise keep what arrived.
      const withdrawn = err instanceof Error && err.name === "WithdrawnReply";
      setMessages((prev) => prev.filter((m) => !(m.id === replyId && (withdrawn || m.content === ""))));
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {intro && <p className="text-sm text-muted italic">{intro}</p>}
      {!aiConfigured && (
        <p className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
          {aiNote ??
            `Conversations with ${character.shortName} need an Anthropic API key on the server. Everything else in the game works without one.`}
        </p>
      )}

      <div className="space-y-4" aria-live="polite">
        {loaded && messages.length === 0 && aiConfigured && (
          <p className="text-sm text-muted">Ask {character.shortName} anything, or pick a question below.</p>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="space-y-2">
              <div className="ml-auto w-fit max-w-[88%] rounded-2xl rounded-br-sm bg-brand-soft px-3.5 py-2 whitespace-pre-wrap">
                {m.content}
              </div>
              <UserCare text={m.content} />
            </div>
          ) : (
            <div key={m.id} className="flex gap-2.5">
              <Portrait appearance={character.appearance} size={36} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-xs font-semibold text-muted">{character.shortName}</p>
                {m.content ? (
                  <>
                    <Markdown>{linkScriptureReferences(m.content)}</Markdown>
                    {!streaming || m !== messages[messages.length - 1] ? <RefChips refs={uniqueReferences(m.content)} /> : null}
                  </>
                ) : (
                  <p className="animate-pulse text-sm text-muted">{character.shortName} is thinking…</p>
                )}
              </div>
            </div>
          ),
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}

      {aiConfigured && !streaming && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted hover:bg-surface-2 hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {aiConfigured && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={2}
            maxLength={2000}
            placeholder={`Say something to ${character.shortName}…`}
            aria-label={`Your message to ${character.shortName}`}
            className="min-w-0 flex-1 resize-none rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-brand"
          />
          {streaming ? (
            <button type="button" onClick={() => abortRef.current?.abort()} className="rounded-lg border border-line px-3 py-2 text-sm font-medium">
              Stop
            </button>
          ) : (
            <button disabled={!input.trim()} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-ink disabled:opacity-50">
              Send
            </button>
          )}
        </form>
      )}
      <p className="text-[11px] leading-snug text-muted">
        {character.shortName} is an AI portrayal grounded in Scripture. It can make mistakes, so read the passages
        yourself, and talk with your pastor about anything important.
      </p>
    </div>
  );
}

/** Shows real help beneath a message that mentions grief, abuse, self-harm or danger. */
function UserCare({ text }: { text: string }) {
  const concerns = detectConcerns(text);
  if (concerns.length === 0) return null;
  return <HelpCard concerns={concerns} compact />;
}
