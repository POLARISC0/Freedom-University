/** A tiny typed event emitter, so the world can talk to the React UI without knowing about it. */
export class Emitter<Events extends Record<string, unknown>> {
  private handlers: { [K in keyof Events]?: Set<(payload: Events[K]) => void> } = {};

  on<K extends keyof Events>(event: K, handler: (payload: Events[K]) => void): () => void {
    (this.handlers[event] ??= new Set()).add(handler);
    return () => this.handlers[event]?.delete(handler);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]) {
    this.handlers[event]?.forEach((h) => h(payload));
  }

  clear() {
    this.handlers = {};
  }
}
