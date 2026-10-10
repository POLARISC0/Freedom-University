import { parseLife, type LifeState } from "@/walk/life";
import type { CheckInView, JournalEntryView, LessonProgressView, ProgressMap } from "@/walk/progress";
import { getCapability, isCapabilityError, type Db, type DocSnapshot, type UserCapability } from "./capabilities";

// Where the preview keeps a player's character and life, progress, journal, check-ins and conversations. On
// claude.ai it uses the artifact's private per-viewer storage (`data/users/<id>/`, which nobody else can read, the
// owner included); anywhere else, or if that storage turns the viewer away, it falls back to this browser's local
// storage, kept apart for each claude.ai account.
//
// Every save writes only the record that changed (one lesson, one day's check-in, one journal entry, one
// conversation merged with what is stored), so a second tab or device can't put back an older copy of the rest.

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface WalkData {
  progress: ProgressMap;
  journal: JournalEntryView[];
  checkIns: CheckInView[];
  /** The player's character and life in the world; null until they make their character. */
  life: LifeState | null;
}

export interface Store {
  /** "account": private to the viewer's claude.ai account. "browser": this browser only. */
  readonly where: "account" | "browser";
  load(): Promise<WalkData>;
  saveLesson(view: LessonProgressView): Promise<void>;
  saveJournalEntry(entry: JournalEntryView): Promise<void>;
  deleteJournalEntry(id: string): Promise<void>;
  saveCheckIn(checkIn: CheckInView): Promise<void>;
  deleteCheckIn(day: string): Promise<void>;
  /** The life is one whole document: the game saves all of it at once. */
  saveLife(life: LifeState): Promise<void>;
  loadThread(key: string): Promise<ChatMessage[]>;
  /** Saves this copy of a conversation, keeping any messages another tab or device added that it hasn't seen. */
  saveThread(key: string, messages: ChatMessage[]): Promise<void>;
  /** Every stored conversation, keyed by its document id. */
  listThreads?(): Promise<{ key: string; messages: ChatMessage[] }[]>;
}

/** Keep only the newest check-ins: a few months is plenty for the journal. */
export const CHECK_INS_KEPT = 120;
/** Messages kept per conversation. */
export const THREAD_KEPT = 60;
/** What a conversation may weigh as JSON: under db's 256 KiB per-document cap, with room for the wrapper. */
const THREAD_BYTES = 240 * 1024;

/** The first version's prefix, still used by a viewer with no claude.ai account here. */
const PLAIN_SCOPE = "walk-preview";

const EMPTY: WalkData = { progress: {}, journal: [], checkIns: [], life: null };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readList<T>(key: string): T[] {
  const list = read<unknown>(key, []);
  return Array.isArray(list) ? (list as T[]) : [];
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked (private window, previews): the session keeps working in memory.
  }
}

const newestEntriesFirst = (a: JournalEntryView, b: JournalEntryView) => b.createdAt.localeCompare(a.createdAt);

/** One check-in per day (a later one in the list wins), newest first, as many as are kept. */
function newestCheckIns(checkIns: CheckInView[]): CheckInView[] {
  const byDay = new Map(checkIns.map((c) => [c.day, c]));
  return [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day)).slice(0, CHECK_INS_KEPT);
}

const byteSize = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;

/** The newest messages that fit in one document, starting with one of the player's. */
export function keepThread(messages: ChatMessage[]): ChatMessage[] {
  const kept: ChatMessage[] = [];
  let size = 0;
  for (const message of messages.slice(-THREAD_KEPT).reverse()) {
    size += byteSize(message) + 1;
    if (size > THREAD_BYTES) break;
    kept.unshift(message);
  }
  while (kept[0]?.role === "assistant") kept.shift();
  return kept;
}

/** This tab's copy of a conversation added onto the stored one: whatever another tab or device saved stays. */
function mergeThread(stored: ChatMessage[], ours: ChatMessage[]): ChatMessage[] {
  const storedIds = new Set(stored.map((m) => m.id));
  const lastShared = ours.findLastIndex((m) => storedIds.has(m.id));
  return keepThread([...stored, ...ours.slice(lastShared + 1)]);
}

function messagesOf(data: Record<string, unknown> | undefined): ChatMessage[] {
  return Array.isArray(data?.messages) ? (data.messages as ChatMessage[]) : [];
}

/** Thread keys become document ids: keep them to the characters the store allows. */
export function threadDocId(key: string): string {
  return key.replace(/[^A-Za-z0-9_\-.~:@+]/g, "_");
}

export class BrowserStore implements Store {
  readonly where = "browser" as const;

  /** `prefix` keeps each claude.ai account's walk apart in a browser they share. */
  constructor(readonly prefix = PLAIN_SCOPE) {}

  async load(): Promise<WalkData> {
    return {
      progress: read(`${this.prefix}:progress`, {}),
      journal: readList<JournalEntryView>(`${this.prefix}:journal`).sort(newestEntriesFirst),
      checkIns: readList(`${this.prefix}:checkins`),
      life: parseLife(read(`${this.prefix}:life`, null)),
    };
  }
  // Each save reads what is stored and changes one record, so two tabs of this browser keep each other's saves.
  async saveLesson(view: LessonProgressView) {
    write(`${this.prefix}:progress`, { ...read<ProgressMap>(`${this.prefix}:progress`, {}), [view.lessonSlug]: view });
  }
  async saveJournalEntry(entry: JournalEntryView) {
    const list = readList<JournalEntryView>(`${this.prefix}:journal`);
    const edited = list.some((e) => e.id === entry.id);
    write(`${this.prefix}:journal`, edited ? list.map((e) => (e.id === entry.id ? entry : e)) : [entry, ...list]);
  }
  async deleteJournalEntry(id: string) {
    write(`${this.prefix}:journal`, readList<JournalEntryView>(`${this.prefix}:journal`).filter((e) => e.id !== id));
  }
  async saveCheckIn(checkIn: CheckInView) {
    write(`${this.prefix}:checkins`, newestCheckIns([...readList<CheckInView>(`${this.prefix}:checkins`), checkIn]));
  }
  async deleteCheckIn(day: string) {
    write(`${this.prefix}:checkins`, readList<CheckInView>(`${this.prefix}:checkins`).filter((c) => c.day !== day));
  }
  async saveLife(life: LifeState) {
    write(`${this.prefix}:life`, life);
  }
  async loadThread(key: string) {
    return readList<ChatMessage>(`${this.prefix}:chat:${threadDocId(key)}`);
  }
  async saveThread(key: string, messages: ChatMessage[]) {
    const at = `${this.prefix}:chat:${threadDocId(key)}`;
    write(at, mergeThread(readList<ChatMessage>(at), messages));
  }
}

function rows<T>(snapshot: { docs: DocSnapshot[] }, key: keyof T): T[] {
  return snapshot.docs.map((d) => d.data() as T | undefined).filter((row): row is T => Boolean(row?.[key]));
}

export class AccountStore implements Store {
  readonly where = "account" as const;
  private root: string;

  constructor(
    private db: Db,
    uid: string,
  ) {
    this.root = `data/users/${uid}`;
  }

  private doc(name: string) {
    return this.db.doc(`${this.root}/${name}`);
  }

  private thread(key: string) {
    return this.doc("chats").collection("threads").doc(threadDocId(key));
  }

  async load(): Promise<WalkData> {
    const [progress, lessons, checkins, days, journal, life] = await Promise.all([
      this.doc("progress").get(),
      this.doc("progress").collection("lessons").get(),
      this.doc("checkins").get(),
      this.doc("checkins").collection("days").get(),
      this.doc("journal").collection("entries").get(),
      this.doc("life").get(),
    ]);
    // The first version kept every lesson in one document and every check-in in another; the documents for one
    // lesson or one day, written since, are newer.
    const legacyDays = checkins.data()?.days;
    return {
      progress: {
        ...(progress.data()?.lessons as ProgressMap | undefined),
        ...Object.fromEntries(rows<LessonProgressView>(lessons, "lessonSlug").map((view) => [view.lessonSlug, view])),
      },
      checkIns: newestCheckIns([
        ...(Array.isArray(legacyDays) ? (legacyDays as CheckInView[]) : []),
        ...rows<CheckInView>(days, "day"),
      ]),
      journal: rows<JournalEntryView>(journal, "id").sort(newestEntriesFirst),
      life: parseLife(life.data()?.life),
    };
  }
  async saveLesson(view: LessonProgressView) {
    await this.doc("progress").collection("lessons").doc(view.lessonSlug).set({ ...view });
  }
  async saveJournalEntry(entry: JournalEntryView) {
    await this.doc("journal").collection("entries").doc(entry.id).set({ ...entry });
  }
  async deleteJournalEntry(id: string) {
    await this.doc("journal").collection("entries").doc(id).delete();
  }
  async saveCheckIn(checkIn: CheckInView) {
    await this.doc("checkins").collection("days").doc(checkIn.day).set({ ...checkIn });
  }
  async deleteCheckIn(day: string) {
    await this.doc("checkins").collection("days").doc(day).delete();
  }
  async saveLife(life: LifeState) {
    await this.doc("life").set({ life });
  }
  async loadThread(key: string) {
    return messagesOf((await this.thread(key).get()).data());
  }
  async saveThread(key: string, messages: ChatMessage[]) {
    const ref = this.thread(key);
    const stored = messagesOf((await ref.get()).data());
    await ref.set({ messages: mergeThread(stored, messages) });
  }
  async listThreads() {
    const threads = await this.doc("chats").collection("threads").get();
    return threads.docs.map((d) => ({ key: d.id, messages: messagesOf(d.data()) }));
  }
}

/**
 * db codes meaning the account has turned this viewer away: a well-formed write below their level (view-only),
 * or db withdrawn from this view. Remembered, so later visits load what this browser kept.
 */
const REFUSED = new Set([
  "invalid_argument",
  "transform_error",
  "revoked",
  "not_granted",
  "capability_disabled",
  "capability_removed",
]);
/** A budget or a cap: trying again at once can't succeed, though a later save may. */
const NOT_NOW = new Set(["resource_exhausted", "quota_exceeded"]);

/** The db code of a failure. Unknown codes, and anything else thrown, count as a passing `unavailable`. */
function codeOf(error: unknown): string {
  return isCapabilityError(error) && (REFUSED.has(error.code) || NOT_NOW.has(error.code)) ? error.code : "unavailable";
}

type Outcome<T> = { ok: true; value: T } | { ok: false; code: string; error: unknown };

/** The saved walk is in the viewer's account but can't be read right now. Nothing has been saved over it. */
export class LoadFailedError extends Error {
  constructor(readonly code: string) {
    super(`The saved walk couldn't be loaded (${code}).`);
    this.name = "LoadFailedError";
  }
}

/**
 * Uses the viewer's account storage while it accepts writes. A passing failure is retried once; a save that still
 * fails, or meets a budget, is tried again with the next one. If the account turns the viewer away (view-only
 * access, say), the rest of the visit, and later visits, are kept in this browser, starting from everything this
 * visit has.
 */
export class FallbackStore implements Store {
  private active: Store;
  /** Account writes that failed for now, by record, oldest first: tried again after the next save succeeds. */
  private unsaved = new Map<string, (store: Store) => Promise<void>>();
  /** Conversations read or written this visit, copied to this browser if the account turns the viewer away. */
  private threads = new Map<string, ChatMessage[]>();
  /** The wait before the one retry a passing failure gets (db: "retry once after a short randomized delay"). */
  pause = () => new Promise<void>((resolve) => setTimeout(resolve, 250 + Math.random() * 750));
  // Supplied by the session: everything this visit has, which the browser starts from if the account is left.
  snapshot: () => WalkData = () => EMPTY;

  constructor(
    private browser: BrowserStore,
    account: Store | null,
    private onFallback: () => void,
  ) {
    this.active = account ?? browser;
  }

  get where() {
    return this.active.where;
  }

  /** One account call, retried once after a short randomized delay if it fails in passing. */
  private async call<T>(run: () => Promise<T>): Promise<Outcome<T>> {
    for (let retried = false; ; retried = true) {
      try {
        return { ok: true, value: await run() };
      } catch (error) {
        const code = codeOf(error);
        if (code !== "unavailable" || retried) return { ok: false, code, error };
        await this.pause();
      }
    }
  }

  async load(): Promise<WalkData> {
    const account = this.active;
    if (account === this.browser) return this.browser.load();
    const result = await this.call(() => account.load());
    if (result.ok) return result.value;
    if (REFUSED.has(result.code)) {
      // db can't be used in this view: this visit starts from what the browser kept and saves nothing to the
      // account. The next visit tries the account again.
      this.switchToBrowser(false);
      return this.browser.load();
    }
    // Starting from an empty walk now would show it reset, and its saves would replace what the account holds.
    throw new LoadFailedError(result.code);
  }

  private switchToBrowser(remember: boolean) {
    if (this.active === this.browser) return;
    this.active = this.browser;
    if (remember) write(`${this.browser.prefix}:browser-only`, true);
    this.onFallback();
  }

  /** The account turned the viewer away: from now on this browser keeps the walk, starting from all this visit has. */
  private async leaveAccount(failed?: (store: Store) => Promise<void>) {
    const account = this.active;
    if (account !== this.browser) {
      const pending = [...this.unsaved.values()];
      this.unsaved.clear();
      this.switchToBrowser(true);
      await this.copyToBrowser(account);
      // Then the saves that failed for now: deletions among them, which a copy of what's there can't carry.
      for (const run of pending) await run(this.browser);
    }
    if (failed) await failed(this.browser);
  }

  private async copyToBrowser(account: Store) {
    const data = this.snapshot();
    for (const view of Object.values(data.progress)) await this.browser.saveLesson(view);
    for (const checkIn of data.checkIns) await this.browser.saveCheckIn(checkIn);
    for (const entry of data.journal) await this.browser.saveJournalEntry(entry);
    if (data.life) await this.browser.saveLife(data.life);
    // Every conversation the account still lets us read, then this visit's copies, which may be newer.
    const stored = (await account.listThreads?.().catch(() => [])) ?? [];
    for (const { key, messages } of stored) await this.browser.saveThread(key, messages);
    for (const [key, messages] of this.threads) await this.browser.saveThread(key, messages);
  }

  private async attempt(record: string, run: (store: Store) => Promise<void>) {
    const account = this.active;
    if (account === this.browser) return run(this.browser);
    // This save replaces one for the same record that failed earlier.
    this.unsaved.delete(record);
    const result = await this.call(() => run(account));
    if (this.active === this.browser) return run(this.browser); // left while this save was on its way
    if (!result.ok) {
      if (REFUSED.has(result.code)) return this.leaveAccount(run);
      // Passing, or a budget: stay with the account (nothing is remembered) and send this again with a later save.
      this.unsaved.set(record, run);
      console.warn(`walk preview: couldn't save to the account just now (${result.code}); will try again`);
      return;
    }
    // The account is answering again: catch up on saves that failed before, oldest first.
    for (const [earlier, retry] of this.unsaved) {
      try {
        await retry(account);
        this.unsaved.delete(earlier);
      } catch (error) {
        const code = codeOf(error);
        if (REFUSED.has(code)) return this.leaveAccount();
        // A full quota holds back only new documents; anything else means the account is struggling again.
        if (code !== "quota_exceeded") break;
      }
    }
  }

  saveLesson(view: LessonProgressView) {
    return this.attempt(`lesson:${view.lessonSlug}`, (s) => s.saveLesson(view));
  }
  saveJournalEntry(entry: JournalEntryView) {
    return this.attempt(`journal:${entry.id}`, (s) => s.saveJournalEntry(entry));
  }
  deleteJournalEntry(id: string) {
    return this.attempt(`journal:${id}`, (s) => s.deleteJournalEntry(id));
  }
  saveCheckIn(checkIn: CheckInView) {
    return this.attempt(`checkin:${checkIn.day}`, (s) => s.saveCheckIn(checkIn));
  }
  deleteCheckIn(day: string) {
    return this.attempt(`checkin:${day}`, (s) => s.deleteCheckIn(day));
  }
  saveLife(life: LifeState) {
    return this.attempt("life", (s) => s.saveLife(life));
  }

  /** A conversation as stored. A read that fails rejects: an empty stand-in would later be saved over the real one. */
  async loadThread(key: string) {
    const account = this.active;
    if (account === this.browser) return this.browser.loadThread(key);
    const result = await this.call(() => account.loadThread(key));
    if (result.ok) {
      this.threads.set(key, result.value);
      return result.value;
    }
    if (!REFUSED.has(result.code)) throw result.error;
    await this.leaveAccount();
    return this.browser.loadThread(key);
  }
  saveThread(key: string, messages: ChatMessage[]) {
    this.threads.set(key, messages);
    return this.attempt(`thread:${key}`, (s) => s.saveThread(key, messages));
  }
}

/**
 * The first version kept every walk in this browser under one plain prefix, and remembered there when an account
 * turned its viewer away. Such a walk belongs to a claude.ai account, so the first account to open this version
 * takes it over, once: its keys move under that account's own prefix.
 */
function claimFirstVersionWalk(prefix: string) {
  if (!read(`${PLAIN_SCOPE}:browser-only`, false)) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${PLAIN_SCOPE}:`) && !key.startsWith(`${PLAIN_SCOPE}:user:`)) keys.push(key);
    }
    for (const key of keys) {
      const value = localStorage.getItem(key);
      const moved = prefix + key.slice(PLAIN_SCOPE.length);
      if (value !== null && localStorage.getItem(moved) === null) localStorage.setItem(moved, value);
      localStorage.removeItem(key);
    }
  } catch {
    // Storage blocked: there's nothing to take over.
  }
}

/** The best store this view offers. */
export async function openStore(onFallback: () => void): Promise<FallbackStore> {
  const [db, user] = await Promise.all([getCapability<Db>("db"), getCapability<UserCapability>("user")]);
  const uid = user ? await user.id().catch(() => null) : null;
  // Each claude.ai account keeps its own walk in this browser; a viewer with no account here keeps the plain one.
  const browser = new BrowserStore(uid ? `${PLAIN_SCOPE}:user:${uid}` : PLAIN_SCOPE);
  if (uid) claimFirstVersionWalk(browser.prefix);
  const browserOnly = read(`${browser.prefix}:browser-only`, false);
  return new FallbackStore(browser, db && uid && !browserOnly ? new AccountStore(db, uid) : null, onFallback);
}
