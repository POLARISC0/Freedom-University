// A small in-memory sliding-window limiter. It is per server process, which suits a single-instance deployment;
// use a shared store (Redis, the database) if you run several instances.

const buckets = new Map<string, number[]>();

/** Record a hit for `key` and report whether it is still within `limit` hits per `windowMs`. */
export function hit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 10_000) {
    for (const [k, times] of buckets) if (times.every((t) => now - t >= windowMs)) buckets.delete(k);
  }
  return recent.length <= limit;
}

/** Whether `key` has already reached `limit` hits in the window, without recording a new one. */
export function isLimited(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  return (buckets.get(key) ?? []).filter((t) => now - t < windowMs).length >= limit;
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}
