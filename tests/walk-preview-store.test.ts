import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LESSONS } from "@/walk/content";
import { DEFAULT_APPEARANCE, newLife } from "@/walk/life";
import type { CollectionRef, Db, DocRef, DocSnapshot } from "@/walk/preview/capabilities";
import { saveCheckIn, submitReflection } from "@/walk/preview/local-actions";
import { startSession, whenSaved } from "@/walk/preview/session";
import {
  BrowserStore,
  CHECK_INS_KEPT,
  FallbackStore,
  LoadFailedError,
  openStore,
  type ChatMessage,
  type Store,
  type WalkData,
} from "@/walk/preview/store";
import type { CheckInView, JournalEntryView, LessonProgressView } from "@/walk/progress";

// The static preview's storage, against an in-memory stand-in for the artifact's `db` (with the 256 KiB document
// cap, and failures on demand) and for localStorage.

type Op = "get" | "set" | "delete" | "list";
const DOC_CAP = 256 * 1024;

class FakeDb implements Db {
  docs = new Map<string, Record<string, unknown>>();
  calls: { op: Op; path: string }[] = [];
  private failures: { op: Op; path: string | RegExp; code: string; times: number }[] = [];

  /** The next `times` calls of `op` on a matching path reject with `code`. */
  fail(op: Op, path: string | RegExp, code: string, times = 1) {
    this.failures.push({ op, path, code, times });
  }

  count(op: Op, path: string | RegExp) {
    return this.calls.filter((c) => c.op === op && matches(c.path, path)).length;
  }

  doc(path: string): DocRef {
    if (path.split("/").length % 2) throw new TypeError(`not a document path: ${path}`);
    return {
      get: async () => {
        this.check("get", path);
        return snapshot(path, this.docs.get(path));
      },
      set: async (data) => {
        this.check("set", path);
        const json = JSON.stringify(data);
        if (new TextEncoder().encode(json).length > DOC_CAP) throw { code: "invalid_argument", message: "too big" };
        this.docs.set(path, JSON.parse(json));
      },
      delete: async () => {
        this.check("delete", path);
        this.docs.delete(path);
      },
      collection: (name) => this.collection(`${path}/${name}`),
    };
  }

  collection(path: string): CollectionRef {
    if (path.split("/").length % 2 === 0) throw new TypeError(`not a collection path: ${path}`);
    return {
      doc: (id = crypto.randomUUID()) => this.doc(`${path}/${id}`),
      get: async () => {
        this.check("list", path);
        const inside = [...this.docs].filter(([p]) => p.startsWith(`${path}/`) && !p.slice(path.length + 1).includes("/"));
        return { docs: inside.map(([p, data]) => snapshot(p, data)) };
      },
    };
  }

  private check(op: Op, path: string) {
    this.calls.push({ op, path });
    const failure = this.failures.find((f) => f.op === op && f.times > 0 && matches(path, f.path));
    if (failure) {
      failure.times--;
      throw { code: failure.code, message: `fake ${failure.code}` };
    }
  }
}

function matches(path: string, pattern: string | RegExp) {
  return typeof pattern === "string" ? path.endsWith(pattern) : pattern.test(path);
}

function snapshot(path: string, data: Record<string, unknown> | undefined): DocSnapshot {
  const copy = data && JSON.parse(JSON.stringify(data));
  return { id: path.split("/").pop()!, exists: Boolean(data), data: () => copy };
}

class MemoryStorage {
  private items = new Map<string, string>();
  get length() {
    return this.items.size;
  }
  key(i: number) {
    return [...this.items.keys()][i] ?? null;
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, String(value));
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  keys() {
    return [...this.items.keys()];
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal("localStorage", storage);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** The store a claude.ai viewer (or, with no uid, someone outside claude.ai) opens. */
async function open(db: FakeDb | null, uid: string | null, onFallback = () => {}) {
  vi.stubGlobal("window", {
    claude: { use: async (name: string) => (name === "db" ? db : name === "user" ? { id: async () => uid } : null) },
  });
  const store = await openStore(onFallback);
  store.pause = async () => {};
  return store;
}

/** Opens and loads, as the preview's boot does. */
async function boot(db: FakeDb | null, uid: string | null, onFallback = () => {}) {
  const store = await open(db, uid, onFallback);
  const data = await store.load();
  startSession(store, data);
  return { store, data };
}

const lesson = (lessonSlug: string, stepIndex: number): LessonProgressView => ({
  lessonSlug,
  stepIndex,
  status: "in_progress",
  choices: {},
  challengeAcceptedAt: null,
  challengeDoneAt: null,
  completedAt: null,
});

const entry = (id: string, createdAt: string, body = id): JournalEntryView => ({
  id,
  kind: "note",
  title: null,
  body,
  lessonSlug: null,
  createdAt,
  updatedAt: createdAt,
});

const exchange = (n: number, size = 20): ChatMessage[] => [
  { id: `u${n}`, role: "user", content: `question ${n} `.padEnd(size, "?") },
  { id: `a${n}`, role: "assistant", content: `answer ${n} `.padEnd(size, "!") },
];

const conversation = (pairs: number, size = 20) => Array.from({ length: pairs }, (_, i) => exchange(i + 1, size)).flat();

const life = () => newLife("Sam", DEFAULT_APPEARANCE, 600, new Date("2026-10-10T12:00:00Z"));
const ROOT = "data/users/u_1";
const LESSON = `${ROOT}/progress/lessons/teach-us-to-pray`;
const THREAD = `${ROOT}/chats/threads/peter:talk`;
const FLAG = "walk-preview:user:u_1:browser-only";

describe("saving to the viewer's account when db fails", () => {
  it("retries a passing failure once and stays with the account", async () => {
    const db = new FakeDb();
    const onFallback = vi.fn();
    const { store } = await boot(db, "u_1", onFallback);
    db.fail("set", LESSON, "unavailable");
    await store.saveLesson(lesson("teach-us-to-pray", 1));
    expect(db.count("set", LESSON)).toBe(2);
    expect(db.docs.get(LESSON)).toMatchObject({ stepIndex: 1 });
    expect(store.where).toBe("account");
    expect(onFallback).not.toHaveBeenCalled();
    expect(storage.getItem(FLAG)).toBeNull();
  });

  it("treats an unknown code, or no code, as passing", async () => {
    const db = new FakeDb();
    const { store } = await boot(db, "u_1");
    db.fail("set", LESSON, "queue_overflow");
    await store.saveLesson(lesson("teach-us-to-pray", 1));
    expect(db.docs.get(LESSON)).toBeDefined();
    expect(store.where).toBe("account");
  });

  it("keeps the account after a failed retry or a budget, and sends those saves again with the next one", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const db = new FakeDb();
    const onFallback = vi.fn();
    const { store } = await boot(db, "u_1", onFallback);
    db.fail("set", LESSON, "unavailable", 2);
    await store.saveLesson(lesson("teach-us-to-pray", 1));
    db.fail("set", "/entries/e1", "resource_exhausted");
    await store.saveJournalEntry(entry("e1", "2026-10-01T00:00:00Z"));
    // A budget isn't retried at once.
    expect(db.count("set", "/entries/e1")).toBe(1);
    expect(db.docs.has(LESSON)).toBe(false);
    expect(store.where).toBe("account");
    expect(storage.getItem(FLAG)).toBeNull();

    await store.saveLife(life());
    expect(db.docs.get(LESSON)).toMatchObject({ stepIndex: 1 });
    expect(db.docs.has(`${ROOT}/journal/entries/e1`)).toBe(true);
    expect(onFallback).not.toHaveBeenCalled();
    // The next visit still uses the account.
    expect((await open(db, "u_1")).where).toBe("account");
  });

  it("doesn't let a full quota hold back other saves waiting to be sent again", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const db = new FakeDb();
    const { store } = await boot(db, "u_1");
    db.fail("set", "/entries/e1", "quota_exceeded", 2);
    await store.saveJournalEntry(entry("e1", "2026-10-01T00:00:00Z"));
    db.fail("set", LESSON, "unavailable", 2);
    await store.saveLesson(lesson("teach-us-to-pray", 1));
    await store.saveLife(life());
    expect(db.docs.has(`${ROOT}/journal/entries/e1`)).toBe(false);
    expect(db.docs.get(LESSON)).toMatchObject({ stepIndex: 1 });
    await store.saveLife(life());
    expect(db.docs.has(`${ROOT}/journal/entries/e1`)).toBe(true);
    expect(store.where).toBe("account");
  });

  it("lets a newer save of the same record replace one that failed", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const db = new FakeDb();
    const { store } = await boot(db, "u_1");
    db.fail("set", LESSON, "resource_exhausted");
    await store.saveLesson(lesson("teach-us-to-pray", 1));
    await store.saveLesson(lesson("teach-us-to-pray", 2));
    await store.saveLife(life());
    expect(db.docs.get(LESSON)).toMatchObject({ stepIndex: 2 });
    expect(db.count("set", LESSON)).toBe(2);
  });

  it("moves to this browser for good when the account refuses a save, taking every conversation and the life", async () => {
    const db = new FakeDb();
    db.docs.set(THREAD, { messages: conversation(2) });
    db.docs.set(`${ROOT}/chats/threads/jesus:teach-us-to-pray`, { messages: conversation(1) });
    db.docs.set(`${ROOT}/life`, { life: life() });
    db.docs.set(`${ROOT}/journal/entries/e1`, { ...entry("e1", "2026-10-01T00:00:00Z") });
    const onFallback = vi.fn();
    const { store, data } = await boot(db, "u_1", onFallback);
    expect(data.life?.name).toBe("Sam");
    const stored = await store.loadThread("peter:talk");

    // A view-only viewer: every write is refused.
    db.fail("set", /./, "invalid_argument", Infinity);
    db.fail("delete", /./, "invalid_argument", Infinity);
    const longer = [...stored, ...exchange(3)];
    await store.saveThread("peter:talk", longer);
    expect(db.count("set", THREAD)).toBe(1);
    expect(store.where).toBe("browser");
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(storage.getItem(FLAG)).toBe("true");

    await store.saveLesson(lesson("teach-us-to-pray", 3));
    expect(db.count("set", LESSON)).toBe(0);

    const next = await open(db, "u_1");
    expect(next.where).toBe("browser");
    const reloaded = await next.load();
    expect(reloaded.life?.name).toBe("Sam");
    expect(reloaded.journal.map((e) => e.id)).toEqual(["e1"]);
    expect(reloaded.progress["teach-us-to-pray"]?.stepIndex).toBe(3);
    expect((await next.loadThread("peter:talk")).map((m) => m.id)).toEqual(longer.map((m) => m.id));
    expect(await next.loadThread("jesus:teach-us-to-pray")).toHaveLength(2);

    // Another claude.ai account in this browser still saves to its own.
    expect((await open(db, "u_2")).where).toBe("account");
  });

  it.each(["invalid_argument", "transform_error", "revoked", "not_granted", "capability_disabled", "capability_removed"])(
    "remembers the move after %s",
    async (code) => {
      const db = new FakeDb();
      const { store } = await boot(db, "u_1");
      db.fail("set", LESSON, code);
      await store.saveLesson(lesson("teach-us-to-pray", 1));
      expect(db.count("set", LESSON)).toBe(1);
      expect(store.where).toBe("browser");
      expect(storage.getItem(FLAG)).toBe("true");
      expect((await (await open(db, "u_1")).load()).progress["teach-us-to-pray"]?.stepIndex).toBe(1);
    },
  );

  it.each(["unavailable", "resource_exhausted", "quota_exceeded"])("doesn't remember anything after %s", async (code) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const db = new FakeDb();
    const { store } = await boot(db, "u_1");
    db.fail("set", LESSON, code, 2);
    await store.saveLesson(lesson("teach-us-to-pray", 1));
    expect(store.where).toBe("account");
    expect(storage.keys().filter((k) => k.endsWith("browser-only"))).toEqual([]);
  });
});

describe("reading the viewer's account when db fails", () => {
  it("never stands in an empty conversation for one that couldn't be read", async () => {
    const db = new FakeDb();
    db.docs.set(THREAD, { messages: conversation(10) });
    const { store } = await boot(db, "u_1");
    db.fail("get", THREAD, "unavailable", 2);
    await expect(store.loadThread("peter:talk")).rejects.toMatchObject({ code: "unavailable" });
    expect(db.count("get", THREAD)).toBe(2);
    db.fail("get", THREAD, "resource_exhausted");
    await expect(store.loadThread("peter:talk")).rejects.toMatchObject({ code: "resource_exhausted" });
    expect(db.count("get", THREAD)).toBe(3);
    expect(await store.loadThread("peter:talk")).toHaveLength(20);
    expect(store.where).toBe("account");
  });

  it("moves to this browser when the grant is withdrawn during a read, keeping the conversations seen", async () => {
    const db = new FakeDb();
    db.docs.set(THREAD, { messages: conversation(2) });
    const { store } = await boot(db, "u_1");
    await store.loadThread("peter:talk");
    db.fail("get", /./, "revoked", Infinity);
    db.fail("list", /./, "revoked", Infinity);
    expect(await store.loadThread("jesus:talk")).toEqual([]);
    expect(store.where).toBe("browser");
    expect(storage.getItem(FLAG)).toBe("true");
    expect(await store.loadThread("peter:talk")).toHaveLength(4);
  });

  it("retries a passing failure at load once", async () => {
    const db = new FakeDb();
    db.docs.set(`${ROOT}/progress`, { lessons: { "teach-us-to-pray": lesson("teach-us-to-pray", 3) } });
    const store = await open(db, "u_1");
    db.fail("get", `${ROOT}/progress`, "unavailable");
    const data = await store.load();
    expect(data.progress["teach-us-to-pray"]?.stepIndex).toBe(3);
    expect(store.where).toBe("account");
  });

  it("fails the load, rather than starting an empty walk, when the account can't be read twice", async () => {
    const db = new FakeDb();
    const onFallback = vi.fn();
    const store = await open(db, "u_1", onFallback);
    db.fail("list", `${ROOT}/journal/entries`, "unavailable", 2);
    const failed = await store.load().catch((e: unknown) => e);
    expect(failed).toBeInstanceOf(LoadFailedError);
    expect(store.where).toBe("account");
    expect(onFallback).not.toHaveBeenCalled();
    expect(db.calls.filter((c) => c.op !== "get" && c.op !== "list")).toEqual([]);
    expect(storage.keys()).toEqual([]);
  });

  it("starts this visit from the browser, saving nothing to the account, when db can't be used in this view", async () => {
    const db = new FakeDb();
    const store = await open(db, "u_1");
    db.fail("get", `${ROOT}/life`, "capability_disabled");
    await store.load();
    expect(store.where).toBe("browser");
    await store.saveLesson(lesson("teach-us-to-pray", 1));
    expect(db.count("set", /./)).toBe(0);
    expect(storage.getItem(FLAG)).toBeNull();
    expect((await open(db, "u_1")).where).toBe("account");
  });
});

describe("saving one record at a time", () => {
  it("doesn't let a tab with an older copy undo another tab's lessons or check-ins", async () => {
    const db = new FakeDb();
    const tabA = await open(db, "u_1");
    const tabB = await open(db, "u_1");
    await Promise.all([tabA.load(), tabB.load()]);
    await tabA.saveLesson(lesson("teach-us-to-pray", 1));
    await tabA.saveCheckIn({ day: "2026-10-09", mood: "grateful", note: null });
    await tabB.saveLesson(lesson("out-of-the-boat", 2));
    await tabB.saveCheckIn({ day: "2026-10-10", mood: "peaceful", note: "Calm today" });

    const data = await (await open(db, "u_1")).load();
    expect(Object.keys(data.progress).sort()).toEqual(["out-of-the-boat", "teach-us-to-pray"]);
    expect(data.checkIns.map((c) => c.day)).toEqual(["2026-10-10", "2026-10-09"]);
  });

  it("still reads the first version's documents, with the newer per-lesson and per-day ones winning", async () => {
    const db = new FakeDb();
    db.docs.set(`${ROOT}/progress`, {
      lessons: { "teach-us-to-pray": lesson("teach-us-to-pray", 5), "out-of-the-boat": lesson("out-of-the-boat", 2) },
    });
    db.docs.set(`${ROOT}/checkins`, {
      days: [
        { day: "2026-10-08", mood: "weary", note: null },
        { day: "2026-10-07", mood: "joyful", note: "old" },
      ],
    });
    db.docs.set(LESSON, { ...lesson("teach-us-to-pray", 6) });
    db.docs.set(`${ROOT}/checkins/days/2026-10-08`, { day: "2026-10-08", mood: "grateful", note: "newer" });
    db.docs.set(`${ROOT}/checkins/days/2026-10-09`, { day: "2026-10-09", mood: "peaceful", note: null });

    const data = await (await open(db, "u_1")).load();
    expect(data.progress["teach-us-to-pray"]?.stepIndex).toBe(6);
    expect(data.progress["out-of-the-boat"]?.stepIndex).toBe(2);
    expect(data.checkIns).toEqual([
      { day: "2026-10-09", mood: "peaceful", note: null },
      { day: "2026-10-08", mood: "grateful", note: "newer" },
      { day: "2026-10-07", mood: "joyful", note: "old" },
    ]);
  });

  it("keeps the messages another tab added to a conversation", async () => {
    const db = new FakeDb();
    db.docs.set(THREAD, { messages: conversation(1) });
    const tabA = await open(db, "u_1");
    const tabB = await open(db, "u_1");
    const [seenA, seenB] = await Promise.all([tabA.loadThread("peter:talk"), tabB.loadThread("peter:talk")]);
    await tabA.saveThread("peter:talk", [...seenA, ...exchange(2)]);
    await tabB.saveThread("peter:talk", [...seenB, ...exchange(3)]);
    const stored = (db.docs.get(THREAD)?.messages as ChatMessage[]).map((m) => m.id);
    expect(stored).toEqual(["u1", "a1", "u2", "a2", "u3", "a3"]);
  });

  it("keeps a long conversation under the 256 KiB document cap, newest messages first", async () => {
    const db = new FakeDb();
    const onFallback = vi.fn();
    const { store } = await boot(db, "u_1", onFallback);
    // Sixty messages of about 8 KB of three-byte characters: far over the cap if saved whole.
    const long = conversation(30, 0).map((m) => ({ ...m, content: "שָׁלוֹם ".repeat(1000) }));
    await store.saveThread("peter:talk", long);
    expect(onFallback).not.toHaveBeenCalled();
    const stored = db.docs.get(THREAD)?.messages as ChatMessage[];
    expect(new TextEncoder().encode(JSON.stringify({ messages: stored })).length).toBeLessThan(DOC_CAP);
    expect(stored.at(-1)?.id).toBe("a30");
    expect(stored[0]?.role).toBe("user");
    expect(stored.length).toBeLessThan(60);
  });

  it("prunes check-ins beyond the newest kept from storage", async () => {
    const db = new FakeDb();
    const days = Array.from({ length: CHECK_INS_KEPT }, (_, i) => {
      const day = new Date(Date.now() - (i + 2) * 86_400_000).toISOString().slice(0, 10);
      return { day, mood: "peaceful", note: null } satisfies CheckInView;
    });
    for (const c of days) db.docs.set(`${ROOT}/checkins/days/${c.day}`, { ...c });
    await boot(db, "u_1");
    const today = new Date().toISOString().slice(0, 10);
    const result = await saveCheckIn({ day: today, mood: "joyful" });
    expect(result.ok).toBe(true);
    await whenSaved();
    expect(db.docs.has(`${ROOT}/checkins/days/${today}`)).toBe(true);
    expect(db.docs.has(`${ROOT}/checkins/days/${days.at(-1)!.day}`)).toBe(false);
    expect((await (await open(db, "u_1")).load()).checkIns).toHaveLength(CHECK_INS_KEPT);
  });
});

describe("this browser's copy", () => {
  it("keeps two tabs' lessons and check-ins", async () => {
    const tabA = new BrowserStore();
    const tabB = new BrowserStore();
    await Promise.all([tabA.load(), tabB.load()]);
    await tabA.saveLesson(lesson("teach-us-to-pray", 1));
    await tabB.saveLesson(lesson("out-of-the-boat", 1));
    await tabA.saveCheckIn({ day: "2026-10-09", mood: "weary", note: null });
    await tabB.saveCheckIn({ day: "2026-10-10", mood: "joyful", note: null });
    const data = await new BrowserStore().load();
    expect(Object.keys(data.progress).sort()).toEqual(["out-of-the-boat", "teach-us-to-pray"]);
    expect(data.checkIns.map((c) => c.day)).toEqual(["2026-10-10", "2026-10-09"]);
  });

  it("keeps an edited journal entry in its place, newest first, after a reload", async () => {
    const store = new BrowserStore();
    await store.saveJournalEntry(entry("first", "2026-10-01T00:00:00Z"));
    await store.saveJournalEntry(entry("second", "2026-10-02T00:00:00Z"));
    await store.saveJournalEntry({ ...entry("first", "2026-10-01T00:00:00Z", "edited"), updatedAt: "2026-10-03T00:00:00Z" });
    const { journal } = await new BrowserStore().load();
    expect(journal.map((e) => [e.id, e.body])).toEqual([
      ["second", "second"],
      ["first", "edited"],
    ]);
  });

  it("keeps each claude.ai account's walk apart", async () => {
    const db = new FakeDb();
    const { store } = await boot(db, "u_1");
    db.fail("set", /./, "invalid_argument", Infinity);
    await store.saveLesson(lesson("teach-us-to-pray", 4));
    expect(store.where).toBe("browser");

    // Another account in this browser, without db here, starts its own browser walk.
    const other = await open(null, "u_2");
    expect(other.where).toBe("browser");
    expect((await other.load()).progress).toEqual({});
    expect((await (await open(null, "u_1")).load()).progress["teach-us-to-pray"]?.stepIndex).toBe(4);
  });

  it("hands the first version's browser walk, once, to the first account that opens this one", async () => {
    storage.setItem("walk-preview:browser-only", "true");
    storage.setItem("walk-preview:progress", JSON.stringify({ "teach-us-to-pray": lesson("teach-us-to-pray", 2) }));
    storage.setItem("walk-preview:life", JSON.stringify(life()));
    storage.setItem("walk-preview:chat:peter:talk", JSON.stringify(conversation(2)));
    const db = new FakeDb();

    const claimed = await open(db, "u_1");
    expect(claimed.where).toBe("browser");
    const data = await claimed.load();
    expect(data.progress["teach-us-to-pray"]?.stepIndex).toBe(2);
    expect(data.life?.name).toBe("Sam");
    expect(await claimed.loadThread("peter:talk")).toHaveLength(4);
    expect(storage.keys().filter((k) => !k.startsWith("walk-preview:user:"))).toEqual([]);

    expect((await open(db, "u_2")).where).toBe("account");
  });

  it("leaves a walk kept by someone with no account here under the plain prefix", async () => {
    storage.setItem("walk-preview:progress", JSON.stringify({ "out-of-the-boat": lesson("out-of-the-boat", 1) }));
    expect((await (await open(new FakeDb(), "u_1")).load()).progress).toEqual({});
    const anonymous = await open(null, null);
    expect(anonymous.where).toBe("browser");
    expect((await anonymous.load()).progress["out-of-the-boat"]?.stepIndex).toBe(1);
  });
});

describe("the order of saves", () => {
  it("saves a reflection's journal entry before moving the lesson past it", async () => {
    const found = LESSONS.flatMap((l) => l.steps.map((s, i) => ({ lesson: l, step: s, index: i }))).find(
      (s) => s.step.kind === "reflection",
    )!;
    const calls: string[] = [];
    const record = (name: string) => async () => void calls.push(name);
    const account: Store = {
      where: "account",
      load: async () => ({ progress: {}, journal: [], checkIns: [], life: null }),
      saveLesson: record("saveLesson"),
      saveJournalEntry: record("saveJournalEntry"),
      deleteJournalEntry: record("deleteJournalEntry"),
      saveCheckIn: record("saveCheckIn"),
      deleteCheckIn: record("deleteCheckIn"),
      saveLife: record("saveLife"),
      loadThread: async () => [],
      saveThread: record("saveThread"),
    };
    const data: WalkData = {
      progress: { [found.lesson.slug]: lesson(found.lesson.slug, found.index) },
      journal: [],
      checkIns: [],
      life: null,
    };
    startSession(new FallbackStore(new BrowserStore("t"), account, () => {}), data);
    const result = await submitReflection({ lessonSlug: found.lesson.slug, stepIndex: found.index, text: "Thy will." });
    expect(result.ok).toBe(true);
    await whenSaved();
    expect(calls).toEqual(["saveJournalEntry", "saveLesson"]);
  });
});

describe("the in-page chat route", () => {
  const reply = "Peace be with you.";

  /** Fresh preview modules (the route keeps conversations in memory), booted against `db` as viewer u_1. */
  async function route(db: FakeDb) {
    vi.resetModules();
    const sample = vi.fn(async (_turns: unknown, options?: { onText?: (u: { text: string; delta: string }) => void }) => {
      options?.onText?.({ text: reply, delta: reply });
      return { text: reply, truncated: false };
    });
    vi.stubGlobal("window", {
      fetch: async () => new Response("not the chat route"),
      claude: {
        use: async (name: string) =>
          name === "db" ? db : name === "user" ? { id: async () => "u_1" } : name === "sample" ? sample : null,
      },
    });
    const store = await import("@/walk/preview/store");
    const session = await import("@/walk/preview/session");
    const chat = await import("@/walk/preview/chat");
    const opened = await store.openStore(() => {});
    opened.pause = async () => {};
    session.startSession(opened, await opened.load());
    chat.installChatRoute();
    const fetch = (url: string, init?: RequestInit) => (window as unknown as { fetch: typeof globalThis.fetch }).fetch(url, init);
    const get = () => fetch("/api/walk/chat?characterId=peter");
    const post = (message: string) =>
      fetch("/api/walk/chat", { method: "POST", body: JSON.stringify({ characterId: "peter", message }) });
    return { sample, get, post, whenSaved: session.whenSaved };
  }

  const stored = (db: FakeDb) => (db.docs.get(THREAD)?.messages as ChatMessage[] | undefined) ?? [];

  it("shows the conversation so far", async () => {
    const db = new FakeDb();
    db.docs.set(THREAD, { messages: conversation(3) });
    const { get } = await route(db);
    const res = await get();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.messages).toHaveLength(6);
    expect(body.error).toBeUndefined();
  });

  it("answers with an error, not an empty conversation, when it can't be read, and adds to the real one later", async () => {
    const db = new FakeDb();
    db.docs.set(THREAD, { messages: conversation(10) });
    const { get, post, sample, whenSaved } = await route(db);
    db.fail("get", THREAD, "unavailable", 2);
    const res = await get();
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.messages).toEqual([]);
    expect(body.error).toMatch(/couldn't be loaded/);
    expect(body.aiConfigured).toBe(true);

    // The failed read wasn't kept: sending reads the conversation again and adds to it.
    const sent = await post("Tell me about the storm.");
    expect(sent.status).toBe(200);
    expect(await sent.text()).toBe(reply);
    await whenSaved();
    expect(sample).toHaveBeenCalledTimes(1);
    expect(stored(db)).toHaveLength(22);
    expect(stored(db).at(-2)).toMatchObject({ role: "user", content: "Tell me about the storm." });
  });

  it("refuses a message, before Claude is asked, while the conversation can't be read", async () => {
    const db = new FakeDb();
    db.docs.set(THREAD, { messages: conversation(10) });
    const { post, sample, whenSaved } = await route(db);
    db.fail("get", THREAD, "unavailable", 2);
    const res = await post("Are you there?");
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/couldn't be loaded/);
    await whenSaved();
    expect(sample).not.toHaveBeenCalled();
    expect(db.count("set", THREAD)).toBe(0);
    expect(stored(db)).toHaveLength(20);
  });
});
