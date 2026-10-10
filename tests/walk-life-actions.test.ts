import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LIFE_MAX_CHARS, readLifeInput } from "@/walk/action-rules";
import { clockTime, routineLine } from "@/walk/components/game/routine";
import { needChanges, namesList } from "@/walk/components/game/Toasts";
import { Autosaver } from "@/walk/components/game/useAutosave";
import { DEFAULT_APPEARANCE, getActivity, newLife } from "@/walk/life";
import { saveLife } from "@/walk/preview/local-actions";
import { current } from "@/walk/preview/session";
import { buildCapernaum } from "@/walk/world/maps/capernaum";

const life = () => newLife("Sam", DEFAULT_APPEARANCE, 600, new Date("2026-10-10T12:00:00Z"));

describe("saving a life", () => {
  it("accepts a life and returns it checked", () => {
    const saved = readLifeInput(JSON.parse(JSON.stringify(life())));
    expect(saved).toEqual(life());
  });

  it("refuses anything that isn't a life", () => {
    for (const garbage of [null, undefined, "life", 42, [], {}, { version: 2, name: "Sam" }, { version: 1 }, { version: 1, name: "   " }]) {
      expect(readLifeInput(garbage)).toBeNull();
    }
  });

  it("refuses a life far too large to be real", () => {
    const padded = { ...life(), counters: { padding: 1 }, notes: "x".repeat(LIFE_MAX_CHARS) };
    expect(readLifeInput(padded)).toBeNull();
    const circular: Record<string, unknown> = { ...life() };
    circular.self = circular;
    expect(readLifeInput(circular)).toBeNull();
  });

  it("tidies what it keeps: the name, numbers and colours", () => {
    const saved = readLifeInput({
      ...life(),
      name: "  Sam\u202e  the   fisher ",
      needs: { prayer: 250, word: -4, fellowship: "lots", service: 40, rest: 60 },
      appearance: { ...DEFAULT_APPEARANCE, robe: "url(javascript:alert(1))", skin: "#AABBCC" },
      relationships: JSON.parse('{ "peter": 1e9, "__proto__": { "polluted": true }, "nobody here": 5 }'),
    });
    expect(saved?.name).toBe("Sam the fisher");
    expect(saved?.needs).toMatchObject({ prayer: 100, word: 0, fellowship: 60, service: 40 });
    expect(saved?.appearance.robe).toBe(DEFAULT_APPEARANCE.robe);
    expect(saved?.appearance.skin).toBe("#aabbcc");
    expect(saved?.relationships).toEqual({ peter: 100 });
  });

  it("is mirrored by the static preview's in-browser action", async () => {
    const ok = await saveLife(life());
    expect(ok).toEqual({ ok: true, data: life() });
    expect(current().life).toEqual(life());
    const refused = await saveLife({ version: 1, name: "" });
    expect(refused.ok).toBe(false);
    expect(current().life).toEqual(life());
  });
});

describe("autosave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", globalThis);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function saverWith(start: number, outcome: () => boolean) {
    const sent: number[] = [];
    const trouble = vi.fn();
    const saver = new Autosaver<number>(start);
    saver.use(async (value) => {
      sent.push(value);
      return outcome() ? { ok: true, data: value } : { ok: false, error: "Couldn't reach the server." };
    }, trouble);
    return { saver, sent, trouble };
  }

  it("saves only the newest value, a few seconds after the last change", async () => {
    const { saver, sent } = saverWith(0, () => true);
    saver.changed(1);
    saver.changed(2);
    await vi.advanceTimersByTimeAsync(3000);
    expect(sent).toEqual([]);
    await vi.advanceTimersByTimeAsync(2000);
    expect(sent).toEqual([2]);
    saver.run();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(sent).toEqual([2]);
  });

  it("doesn't save what the game started with", async () => {
    const { saver, sent } = saverWith(5, () => true);
    saver.changed(5);
    saver.run();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sent).toEqual([]);
  });

  it("says so once when saving fails, then keeps trying until it works", async () => {
    let online = false;
    const { saver, sent, trouble } = saverWith(0, () => online);
    saver.changed(1);
    await vi.advanceTimersByTimeAsync(4000);
    expect(sent).toEqual([1]);
    expect(trouble).toHaveBeenCalledTimes(1);
    // Changes while failing wait for the retry instead of hammering the server.
    saver.changed(2);
    await vi.advanceTimersByTimeAsync(5000);
    expect(sent).toEqual([1]);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(sent).toEqual([1, 2]);
    expect(trouble).toHaveBeenCalledTimes(1);
    online = true;
    await vi.advanceTimersByTimeAsync(30_000);
    expect(sent).toEqual([1, 2, 2]);
    saver.changed(3);
    await vi.advanceTimersByTimeAsync(4000);
    expect(sent).toEqual([1, 2, 2, 3]);
    expect(trouble).toHaveBeenCalledTimes(1);
  });

  it("sends one save at a time and follows up with what changed meanwhile", async () => {
    const sent: number[] = [];
    let finish: () => void = () => {};
    const saver = new Autosaver<number>(0);
    saver.use(
      (value) =>
        new Promise((resolve) => {
          sent.push(value);
          finish = () => resolve({ ok: true, data: value });
        }),
      () => {},
    );
    saver.changed(1);
    saver.run();
    saver.changed(2);
    saver.run();
    expect(sent).toEqual([1]);
    finish();
    await vi.advanceTimersByTimeAsync(4000);
    expect(sent).toEqual([1, 2]);
  });
});

describe("the characters' days", () => {
  it("reads clock times plainly", () => {
    expect([4, 6.5, 12, 17.5, 0, 21.75].map(clockTime)).toEqual(["4am", "6:30am", "noon", "5:30pm", "midnight", "9:45pm"]);
  });

  it("sums up a routine in one line, from the world's own schedule", () => {
    const map = buildCapernaum();
    const day = (id: string) => routineLine(map.npcs.find((n) => n.characterId === id)?.schedule, map.spots);
    expect(day("jesus")).toBe(
      "4am a quiet place on the hillside · 6:30am the boats · 8:30am the shore where Jesus teaches · 5:30pm Peter's table · 10pm Peter's courtyard",
    );
    expect(day("peter")).toMatch(/^4am Peter's boat · 7am mending nets · /);
    expect(day("andrew")).toMatch(/9:30pm home for the night$/);
    expect(routineLine(undefined, map.spots)).toBeNull();
  });
});

describe("activity results", () => {
  it("lists what an activity gives, gains first", () => {
    expect(needChanges(getActivity("nets")!).map((c) => c.label)).toEqual(["+20 Service", "−8 Rest"]);
    expect(needChanges(getActivity("pray")!).map((c) => c.label)).toEqual(["+25 Prayer"]);
  });

  it("names the people who were there", () => {
    expect(namesList([])).toBe("");
    expect(namesList(["Peter"])).toBe("Peter");
    expect(namesList(["Peter", "Andrew"])).toBe("Peter and Andrew");
    expect(namesList(["Peter", "Andrew", "John"])).toBe("Peter, Andrew and John");
  });
});
