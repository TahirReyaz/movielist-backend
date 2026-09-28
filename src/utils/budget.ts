/**
 * Process `items` with a small worker pool, but stop starting new items once
 * `deadline` (epoch ms) has passed. Items already started are allowed to finish.
 *
 * Used by cron jobs so a run always ends before the cron service / Vercel
 * times out; the next run continues where this one stopped.
 */
export const processWithinBudget = async <T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  { concurrency, deadline }: { concurrency: number; deadline: number }
): Promise<{ results: R[]; processed: number; stoppedEarly: boolean }> => {
  const results: R[] = [];
  let index = 0;
  let stoppedEarly = false;

  const runWorker = async () => {
    while (index < items.length) {
      if (Date.now() >= deadline) {
        stoppedEarly = true;
        return;
      }
      const item = items[index++];
      results.push(await worker(item));
    }
  };

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, runWorker)
  );

  return { results, processed: results.length, stoppedEarly };
};

/** `Date.now() + budget`, clamped to something sane. */
export const deadlineIn = (budgetMs: number, maxMs = 55_000) =>
  Date.now() + Math.max(1_000, Math.min(budgetMs, maxMs));
