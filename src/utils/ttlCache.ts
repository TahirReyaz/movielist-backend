/**
 * Tiny in-memory cache with expiry + size cap, that also de-duplicates
 * concurrent lookups (10 entries of the same show -> 1 TMDB request).
 *
 * It lives in process memory, so on Vercel it only helps within one warm
 * instance / one request. That's exactly the batch-job case.
 */
export class TtlCache<V> {
  private store = new Map<string, { value: Promise<V>; expiresAt: number }>();

  constructor(private ttlMs: number, private maxEntries = 500) {}

  /** Return the cached value, or run `load` once and cache its result. */
  getOrLoad(key: string, load: () => Promise<V>): Promise<V> {
    const now = Date.now();
    const hit = this.store.get(key);
    if (hit && hit.expiresAt > now) return hit.value;

    const value = load();
    this.store.set(key, { value, expiresAt: now + this.ttlMs });
    // Never cache failures – next caller retries.
    value.catch(() => {
      if (this.store.get(key)?.value === value) this.store.delete(key);
    });

    if (this.store.size > this.maxEntries) {
      // Map keeps insertion order: drop the oldest.
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    return value;
  }

  clear() {
    this.store.clear();
  }

  get size() {
    return this.store.size;
  }
}
