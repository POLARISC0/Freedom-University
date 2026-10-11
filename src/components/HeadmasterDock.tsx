"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Markdown } from "./Markdown";

interface HeadmasterView {
  id: string;
  name: string;
  title: string;
  color: string;
}

interface Msg {
  id: string;
  role: string;
  content: string;
}

/** Talk to a Headmaster from anywhere in the world. Mounted once, in the nav. */
export function HeadmasterDock({ headmasters, signedIn }: { headmasters: HeadmasterView[]; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(headmasters[0].id);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const active = headmasters.find((h) => h.id === activeId) ?? headmasters[0];

  const show = useCallback((id?: string) => {
    if (id) setActiveId(id);
    setOpen(true);
  }, []);

  useEffect(() => {
    const onOpen = (e: Event) => show((e as CustomEvent<string>).detail);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("fu:headmaster", onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("fu:headmaster", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, [show]);

  useEffect(() => {
    if (!open || !signedIn) return;
    let cancelled = false;
    fetch(`/api/headmaster?headmaster=${activeId}`)
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((body: { messages: Msg[] }) => {
        if (!cancelled) setMessages(body.messages);
      });
    inputRef.current?.focus();
    return () => {
      cancelled = true;
    };
  }, [open, activeId, signedIn]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, busy]);

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setError(null);
    setBusy(true);
    setMessages((m) => [...m, { id: `me-${Date.now()}`, role: "user", content: message }]);
    try {
      const res = await fetch("/api/headmaster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headmaster: activeId, message }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      setMessages((m) => [...m, body.message]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : show())}
        className="rainbow-ring rounded-full p-[2px] text-xs font-bold tracking-wide uppercase"
        aria-expanded={open}
        aria-controls="headmaster-dock"
      >
        <span className="block rounded-full bg-white px-3 py-1.5 text-black">Ask a Headmaster</span>
      </button>

      {/* Portalled: the nav's backdrop blur would otherwise trap this fixed panel inside it. */}
      {open &&
        createPortal(
          <div
            id="headmaster-dock"
            role="dialog"
            aria-label={`Talk to ${active.name}`}
            className="fixed inset-2 z-50 flex sm:inset-auto sm:top-16 sm:right-4 sm:bottom-4 sm:w-[380px] flex-col rounded-2xl bg-white text-[#0B0B0C] shadow-[8px_8px_0_#0B0B0C] ring-2 ring-[#0B0B0C]"
          >
            <div className="flex items-start justify-between gap-2 border-b border-black/10 p-4">
              <div className="flex gap-1.5" role="tablist" aria-label="Headmasters">
                {headmasters.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    role="tab"
                    aria-selected={h.id === activeId}
                    onClick={() => {
                      if (h.id === activeId) return;
                      setMessages([]);
                      setActiveId(h.id);
                    }}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black tracking-wide uppercase ${h.id === activeId ? "bg-[#0B0B0C] text-white" : "ring-1 ring-black/15 hover:ring-black/40"}`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: h.color }} />
                    {h.name}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-2 py-1 font-mono text-xs ring-1 ring-black/15 hover:ring-black"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="px-4 pt-3 font-mono text-[10px] tracking-widest text-black/55 uppercase">
              Headmaster · {active.title.replace("Headmaster of ", "")} · oversees every district
            </p>

            <div
              className="flex-1 space-y-3 overflow-y-auto p-4 text-base"
              aria-live="polite"
              onClick={(e) => {
                // Following a handoff link: get out of the way of the mentor's page.
                if ((e.target as HTMLElement).closest("a[href^='/']")) setOpen(false);
              }}
            >
              {!signedIn ? (
                <p className="text-black/70">
                  <Link href="/login" className="font-bold underline">
                    Sign in
                  </Link>{" "}
                  to talk to {headmasters.map((h) => h.name).join(" and ")}. They can answer questions, route you to the right district and brief a
                  mentor for you.
                </p>
              ) : messages.length === 0 ? (
                <p className="text-black/60">
                  Ask {active.name} anything: where to start, how lessons work, or which mentor can help. Education only, never financial advice.
                </p>
              ) : (
                messages.map((m) =>
                  m.role === "user" ? (
                    <p key={m.id} className="ml-8 rounded-xl rounded-br-sm bg-[#F2F3F7] px-3 py-2 whitespace-pre-wrap">
                      {m.content}
                    </p>
                  ) : (
                    <div key={m.id} className="mr-4">
                      <p className="mb-1 font-mono text-[10px] tracking-widest uppercase" style={{ color: active.color }}>
                        {active.name}
                      </p>
                      <Markdown>{m.content}</Markdown>
                    </div>
                  ),
                )
              )}
              {busy && <p className="animate-pulse font-mono text-[10px] tracking-widest text-black/60 uppercase">{active.name} is thinking…</p>}
              {error && <p className="text-sm text-[#B42318]">{error}</p>}
              <div ref={endRef} />
            </div>

            {signedIn && (
              <form
                className="flex gap-2 border-t border-black/10 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <label htmlFor="headmaster-input" className="sr-only">
                  Message {active.name}
                </label>
                <textarea
                  id="headmaster-input"
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={2}
                  maxLength={2000}
                  placeholder={`Ask ${active.name}…`}
                  className="min-w-0 flex-1 resize-none rounded-lg px-3 py-2 text-sm ring-1 ring-black/15 outline-none focus:ring-black"
                />
                <button
                  disabled={busy || !input.trim()}
                  className="rounded-lg bg-[#0B0B0C] px-4 text-sm font-black text-white uppercase disabled:opacity-40"
                >
                  Send
                </button>
              </form>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
