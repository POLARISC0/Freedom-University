"use client";

import { useEffect, useRef, useState } from "react";
import type { Source } from "@/content/types";
import { linkSourceCitations } from "@/lib/citations";
import { LESSON_KICKOFF } from "@/lib/prompts";
import { Markdown } from "./Markdown";

export interface ChatMessageView {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Can you give me a real-world example?",
  "Explain that more simply.",
  "What are the main risks here?",
  "Am I ready for the quiz?",
];

export function ChatRoom({
  professor,
  moduleSlug,
  sources,
  initialMessages,
}: {
  professor: { slug: string; name: string; emoji: string };
  moduleSlug: string;
  sources: Source[];
  initialMessages: ChatMessageView[];
}) {
  const [messages, setMessages] = useState<ChatMessageView[]>(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professorSlug: professor.slug, moduleSlug, message }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === replyId ? { ...m, content: m.content + chunk } : m)),
        );
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setMessages((prev) => prev.filter((m) => !(m.id === replyId && m.content === "")));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-line bg-surface">
      <div className="max-h-[65vh] min-h-[320px] space-y-5 overflow-y-auto p-4 sm:p-6" aria-live="polite">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="text-5xl" aria-hidden>{professor.emoji}</div>
            <p className="max-w-sm text-muted">
              {professor.name} is ready to teach this module. Start the lesson, or ask your own question.
            </p>
            <button
              onClick={() => send(LESSON_KICKOFF)}
              className="rounded-lg bg-brand px-5 py-2.5 font-medium text-brand-ink"
            >
              Start the lesson
            </button>
          </div>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand-soft px-4 py-2.5 whitespace-pre-wrap">
                {m.content}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex gap-3">
              <div className="mt-0.5 text-2xl" aria-hidden>{professor.emoji}</div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs font-medium text-muted">{professor.name}</p>
                {m.content ? (
                  <Markdown>{linkSourceCitations(m.content, sources)}</Markdown>
                ) : (
                  <p className="animate-pulse text-sm text-muted">Thinking…</p>
                )}
              </div>
            </div>
          ),
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="border-t border-line px-4 py-2 text-sm text-danger">{error}</p>}

      {messages.length > 0 && !streaming && (
        <div className="flex flex-wrap gap-2 border-t border-line px-4 pt-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:bg-surface-2 hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 p-3"
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
          maxLength={4000}
          placeholder={`Ask ${professor.name.split(" ").at(-1)} a question…`}
          className="min-w-0 flex-1 resize-none rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-brand"
          aria-label="Your message"
        />
        {streaming ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="rounded-lg border border-line px-4 py-2 font-medium"
          >
            Stop
          </button>
        ) : (
          <button
            disabled={!input.trim()}
            className="rounded-lg bg-brand px-4 py-2 font-medium text-brand-ink disabled:opacity-50"
          >
            Send
          </button>
        )}
      </form>
    </div>
  );
}
