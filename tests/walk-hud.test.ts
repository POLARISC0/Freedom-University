import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChatPanel } from "@/walk/components/ChatPanel";
import { ToastStack, type ToastBody } from "@/walk/components/game/Toasts";
import { getCharacter } from "@/walk/content";
import { ACTIVITIES, BADGES, getActivity } from "@/walk/life";

// The game's HUD pieces, rendered as they first appear (before any effect runs).

describe("the activity bar's label", () => {
  it("says what the player is doing, in the present tense, for every activity", () => {
    for (const a of ACTIVITIES) {
      expect(a.doing, a.id).toMatch(/^[A-Z][a-z]+ing\b/);
      expect(a.doing, a.id).not.toMatch(/[.…!?]$/);
      expect(a.doing, a.id).not.toBe(a.action);
    }
    expect(getActivity("pray")!.doing).toBe("Praying in the quiet place");
  });
});

describe("a conversation before its history has loaded", () => {
  const peter = getCharacter("peter")!;
  const html = renderToStaticMarkup(
    createElement(ChatPanel, { character: peter, suggestions: ["How do I have more faith?"] }),
  );

  it("says it is opening, and offers nothing to send yet", () => {
    expect(html).toContain("Opening your conversation with Peter");
    // Suggestions would send at once; the history arriving would then wipe the message and its reply.
    expect(html).not.toContain("How do I have more faith?");
    expect(html).toMatch(/<button disabled=""[^>]*>Send<\/button>/);
    expect(html).not.toContain("pick a question below");
  });

  it("still lets the player type", () => {
    expect(html).toMatch(/<textarea(?![^>]*disabled)[^>]*aria-label="Your message to Peter"/);
  });
});

describe("toasts", () => {
  const toasts: { id: number; body: ToastBody }[] = [
    { id: 1, body: { kind: "activity", def: getActivity("pray")!, company: [] } },
    { id: 2, body: { kind: "badge", badge: BADGES[0] } },
    { id: 3, body: { kind: "text", text: "Saved to your Walk Journal" } },
  ];
  const render = (props: Partial<ComponentProps<typeof ToastStack>> = {}) =>
    renderToStaticMarkup(createElement(ToastStack, { toasts, onDismiss: () => {}, ...props }));

  it("shows the newest few at once", () => {
    const html = render();
    expect(html).toContain(getActivity("pray")!.done);
    expect(html).toContain(BADGES[0].title);
    expect(html).toContain("Saved to your Walk Journal");
  });

  it("shows one at a time beside an open panel, the newest first", () => {
    const html = render({ max: 1 });
    expect(html).toContain("Saved to your Walk Journal");
    expect(html).not.toContain(BADGES[0].title);
    expect(html).not.toContain(getActivity("pray")!.done);
  });

  it("keeps the larger ones waiting above a phone's panel, where only a line fits", () => {
    const html = renderToStaticMarkup(
      createElement(ToastStack, { toasts: toasts.slice(0, 2), onDismiss: () => {}, max: 1, linesOnly: true }),
    );
    expect(html).not.toContain(BADGES[0].title);
    expect(html).not.toContain(getActivity("pray")!.done);
    expect(render({ max: 1, linesOnly: true })).toContain("Saved to your Walk Journal");
  });
});
