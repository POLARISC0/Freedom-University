import type { FallbackStore, Store, WalkData } from "./store";

// The preview's copy of the player's data. The in-browser actions change it at once and save in the background,
// one write at a time, so the game never waits on storage.

let data: WalkData = { progress: {}, journal: [], checkIns: [], life: null };
let store: FallbackStore | null = null;
let queue: Promise<void> = Promise.resolve();

export function startSession(opened: FallbackStore, loaded: WalkData) {
  store = opened;
  data = loaded;
  opened.snapshot = () => data;
}

export function current(): WalkData {
  return data;
}

export function change(next: Partial<WalkData>) {
  data = { ...data, ...next };
}

/** Queue a save. Failures are handled by the store (it moves to this browser); nothing here can throw. */
export function persist(write: (s: Store) => Promise<void>) {
  const s = store;
  if (!s) return;
  queue = queue.then(() => write(s)).catch((error) => console.warn("walk preview: save failed", error));
}

export function activeStore(): FallbackStore | null {
  return store;
}

export function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
