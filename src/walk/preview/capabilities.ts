// Typed access to the claude.ai artifact runtime (`window.claude.use`), covering only what the preview uses.
// Outside a claude.ai viewer there is no `window.claude`, and every capability resolves null.

export interface SampleTurn {
  role: "user" | "assistant";
  content: string;
}

export interface SampleOptions {
  onText?: (update: { text: string; delta: string }) => void;
  signal?: AbortSignal;
  modelTier?: "default" | "complex" | "quick";
  cache?: boolean;
}

export type Sample = (
  input: string | SampleTurn[],
  options?: SampleOptions,
) => Promise<{ text: string; truncated: boolean }>;

/** What `sample` and `db` calls reject with. */
export interface CapabilityError {
  code: string;
  message: string;
  text?: string;
}

export function isCapabilityError(e: unknown): e is CapabilityError {
  return typeof e === "object" && e !== null && typeof (e as CapabilityError).code === "string";
}

export interface DocSnapshot {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

export interface DocRef {
  get(): Promise<DocSnapshot>;
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
  collection(path: string): CollectionRef;
}

export interface CollectionRef {
  doc(id?: string): DocRef;
  get(): Promise<{ docs: DocSnapshot[] }>;
}

export interface Db {
  doc(path: string): DocRef;
  collection(path: string): CollectionRef;
}

export interface UserCapability {
  id(): Promise<string | null>;
}

interface ClaudeRuntime {
  use(name: string): Promise<unknown>;
}

export async function getCapability<T>(name: "sample" | "db" | "user"): Promise<T | null> {
  const runtime = (window as unknown as { claude?: ClaudeRuntime }).claude;
  if (!runtime?.use) return null;
  try {
    return ((await runtime.use(name)) as T | null) ?? null;
  } catch {
    return null;
  }
}
