import type { CheckInView, JournalEntryView, ProgressMap } from "@/walk/progress";
import { getCapability, type Db, type UserCapability } from "./capabilities";

// Where the preview keeps a player's progress, journal, check-ins and conversations. On claude.ai it uses the
// artifact's private per-viewer storage (`data/users/<id>/`, which nobody else can read, the owner included);
// anywhere else, or if that storage refuses a write, it falls back to this browser's local storage.

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface WalkData {
  progress: ProgressMap;
  journal: JournalEntryView[];
  checkIns: CheckInView[];
}

export interface Store {
  /** "account": private to the viewer's claude.ai account. "browser": this browser only. */
  readonly where: "account" | "browser";
  load(): Promise<WalkData>;
  saveProgress(progress: ProgressMap): Promise<void>;
  saveJournalEntry(entry: JournalEntryView): Promise<void>;
  deleteJournalEntry(id: string): Promise<void>;
  saveCheckIns(checkIns: CheckInView[]): Promise<void>;
  loadThread(key: string): Promise<ChatMessage[]>;
  saveThread(key: string, messages: ChatMessage[]): Promise<void>;
}

const EMPTY: WalkData = { progress: {}, journal: [], checkIns: [] };
/** Set once the viewer's account refused a save: from then on this browser keeps their walk. */
const BROWSER_ONLY = "walk-preview:browser-only";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked (private window, previews): the session keeps working in memory.
  }
}

export class BrowserStore implements Store {
  readonly where = "browser" as const;
  private prefix = "walk-preview";

  async load(): Promise<WalkData> {
    return {
      progress: read(`${this.prefix}:progress`, {}),
      journal: read(`${this.prefix}:journal`, []),
      checkIns: read(`${this.prefix}:checkins`, []),
    };
  }
  async saveProgress(progress: ProgressMap) {
    write(`${this.prefix}:progress`, progress);
  }
  async saveJournalEntry(entry: JournalEntryView) {
    const list = read<JournalEntryView[]>(`${this.prefix}:journal`, []);
    write(`${this.prefix}:journal`, [entry, ...list.filter((e) => e.id !== entry.id)]);
  }
  async deleteJournalEntry(id: string) {
    write(`${this.prefix}:journal`, read<JournalEntryView[]>(`${this.prefix}:journal`, []).filter((e) => e.id !== id));
  }
  async saveCheckIns(checkIns: CheckInView[]) {
    write(`${this.prefix}:checkins`, checkIns);
  }
  async loadThread(key: string) {
    return read<ChatMessage[]>(`${this.prefix}:chat:${key}`, []);
  }
  async saveThread(key: string, messages: ChatMessage[]) {
    write(`${this.prefix}:chat:${key}`, messages);
  }
}

/** Thread keys become document ids: keep them to the characters the store allows. */
export function threadDocId(key: string): string {
  return key.replace(/[^A-Za-z0-9_\-.~:@+]/g, "_");
}

class AccountStore implements Store {
  readonly where = "account" as const;
  private root: string;

  constructor(
    private db: Db,
    uid: string,
  ) {
    this.root = `data/users/${uid}`;
  }

  async load(): Promise<WalkData> {
    const [progress, checkins, journal] = await Promise.all([
      this.db.doc(`${this.root}/progress`).get(),
      this.db.doc(`${this.root}/checkins`).get(),
      this.db.doc(`${this.root}/journal`).collection("entries").get(),
    ]);
    return {
      progress: (progress.data()?.lessons as ProgressMap | undefined) ?? {},
      checkIns: (checkins.data()?.days as CheckInView[] | undefined) ?? [],
      journal: journal.docs
        .map((d) => d.data() as unknown as JournalEntryView | undefined)
        .filter((e): e is JournalEntryView => Boolean(e?.id))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }
  async saveProgress(progress: ProgressMap) {
    await this.db.doc(`${this.root}/progress`).set({ lessons: progress });
  }
  async saveJournalEntry(entry: JournalEntryView) {
    await this.db.doc(`${this.root}/journal`).collection("entries").doc(entry.id).set({ ...entry });
  }
  async deleteJournalEntry(id: string) {
    await this.db.doc(`${this.root}/journal`).collection("entries").doc(id).delete();
  }
  async saveCheckIns(checkIns: CheckInView[]) {
    await this.db.doc(`${this.root}/checkins`).set({ days: checkIns });
  }
  async loadThread(key: string) {
    const snap = await this.db.doc(`${this.root}/chats`).collection("threads").doc(threadDocId(key)).get();
    return (snap.data()?.messages as ChatMessage[] | undefined) ?? [];
  }
  async saveThread(key: string, messages: ChatMessage[]) {
    await this.db.doc(`${this.root}/chats`).collection("threads").doc(threadDocId(key)).set({ messages });
  }
}

/**
 * Uses the viewer's account storage while it accepts writes. If it refuses one (a view-only visitor, say), the
 * rest of the visit is kept in this browser instead, starting from everything loaded so far.
 */
export class FallbackStore implements Store {
  private active: Store;
  private browser = new BrowserStore();
  private onFallback: () => void;

  constructor(primary: Store, onFallback: () => void) {
    this.active = primary;
    this.onFallback = onFallback;
  }

  get where() {
    return this.active.where;
  }

  async load(): Promise<WalkData> {
    try {
      return await this.active.load();
    } catch {
      // Possibly a passing failure, so this visit uses the browser but the next one tries the account again.
      this.switchToBrowser(false);
      return this.browser.load();
    }
  }

  private switchToBrowser(remember: boolean) {
    if (this.active === this.browser) return;
    this.active = this.browser;
    if (remember) write(BROWSER_ONLY, true);
    this.onFallback();
  }

  private async attempt(run: (store: Store) => Promise<void>, copyAll: () => Promise<void>) {
    try {
      await run(this.active);
    } catch {
      if (this.active === this.browser) return;
      // A refused write means this viewer can't save to their account (view-only access, say). Remember that, so
      // later visits load what this browser kept instead of an empty account.
      this.switchToBrowser(true);
      await copyAll();
    }
  }

  // Each write carries a "copy everything" fallback so nothing is lost when switching to the browser mid-visit.
  snapshot: () => WalkData = () => EMPTY;

  private copyAllToBrowser = async () => {
    const data = this.snapshot();
    await this.browser.saveProgress(data.progress);
    await this.browser.saveCheckIns(data.checkIns);
    for (const entry of [...data.journal].reverse()) await this.browser.saveJournalEntry(entry);
  };

  saveProgress(progress: ProgressMap) {
    return this.attempt((s) => s.saveProgress(progress), this.copyAllToBrowser);
  }
  saveJournalEntry(entry: JournalEntryView) {
    return this.attempt((s) => s.saveJournalEntry(entry), this.copyAllToBrowser);
  }
  deleteJournalEntry(id: string) {
    return this.attempt((s) => s.deleteJournalEntry(id), this.copyAllToBrowser);
  }
  saveCheckIns(checkIns: CheckInView[]) {
    return this.attempt((s) => s.saveCheckIns(checkIns), this.copyAllToBrowser);
  }
  async loadThread(key: string) {
    try {
      return await this.active.loadThread(key);
    } catch {
      return this.browser.loadThread(key);
    }
  }
  saveThread(key: string, messages: ChatMessage[]) {
    return this.attempt(
      (s) => s.saveThread(key, messages),
      async () => {
        await this.copyAllToBrowser();
        await this.browser.saveThread(key, messages);
      },
    );
  }
}

/** The best store this view offers. */
export async function openStore(onFallback: () => void): Promise<FallbackStore> {
  if (read(BROWSER_ONLY, false)) return new FallbackStore(new BrowserStore(), onFallback);
  const [db, user] = await Promise.all([getCapability<Db>("db"), getCapability<UserCapability>("user")]);
  const uid = user ? await user.id().catch(() => null) : null;
  const primary: Store = db && uid ? new AccountStore(db, uid) : new BrowserStore();
  return new FallbackStore(primary, onFallback);
}
