/**
 * Small, dependency-free helpers to stay under TMDB's rate limit.
 *
 * TMDB (2026): roughly 50 requests/second and 20 open connections per IP.
 * We stay well below that. Note: on Vercel every running instance has its
 * own limiter, so keep these numbers conservative.
 */

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export type Limiter = {
  /** Run `task` when a slot is free. */
  run<T>(task: () => Promise<T>): Promise<T>;
  /** Requests waiting for a slot (for logging). */
  pending(): number;
};

/**
 * At most `maxConcurrent` tasks at once, and at least `minIntervalMs`
 * between task starts (=> max 1000 / minIntervalMs starts per second).
 */
export const createLimiter = ({
  maxConcurrent,
  minIntervalMs,
}: {
  maxConcurrent: number;
  minIntervalMs: number;
}): Limiter => {
  let active = 0;
  let nextStartAt = 0;
  const queue: (() => void)[] = [];

  const pump = () => {
    if (active >= maxConcurrent || queue.length === 0) return;
    const now = Date.now();
    const wait = nextStartAt - now;
    if (wait > 0) {
      setTimeout(pump, wait);
      return;
    }
    nextStartAt = now + minIntervalMs;
    active += 1;
    queue.shift()!();
    pump();
  };

  return {
    run<T>(task: () => Promise<T>) {
      return new Promise<T>((resolve, reject) => {
        queue.push(() => {
          task()
            .then(resolve, reject)
            .finally(() => {
              active -= 1;
              pump();
            });
        });
        pump();
      });
    },
    pending: () => queue.length,
  };
};

type HttpLikeError = {
  response?: { status?: number; headers?: Record<string, unknown> };
  code?: string;
};

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const RETRYABLE_CODES = new Set(["ECONNRESET", "ETIMEDOUT", "ECONNABORTED"]);

/** Seconds from a Retry-After header, if present and sane. */
const retryAfterMs = (error: HttpLikeError): number | null => {
  const raw = error.response?.headers?.["retry-after"];
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.min(seconds, 30) * 1000 : null;
};

export const isRetryable = (error: unknown): boolean => {
  const e = error as HttpLikeError;
  const status = e?.response?.status;
  return (status !== undefined && RETRYABLE_STATUS.has(status)) ||
    (e?.code !== undefined && RETRYABLE_CODES.has(e.code));
};

/**
 * Retry on 429 / 5xx / network resets, honouring Retry-After,
 * otherwise exponential backoff with jitter: ~0.5s, 1s, 2s ...
 */
export const withRetry = async <T>(
  task: () => Promise<T>,
  { retries = 3, baseDelayMs = 500 }: { retries?: number; baseDelayMs?: number } = {}
): Promise<T> => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await task();
    } catch (error) {
      if (attempt >= retries || !isRetryable(error)) throw error;
      const delay =
        retryAfterMs(error as HttpLikeError) ??
        baseDelayMs * 2 ** attempt + Math.random() * baseDelayMs;
      await sleep(delay);
    }
  }
};
