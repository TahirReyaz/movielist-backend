import assert from "node:assert/strict";
import { test } from "node:test";

import { createLimiter, withRetry } from "../src/utils/rateLimit";
import { TtlCache } from "../src/utils/ttlCache";
import { processWithinBudget } from "../src/utils/budget";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("limiter caps concurrency and spaces out starts", async () => {
  const limiter = createLimiter({ maxConcurrent: 3, minIntervalMs: 20 });
  let active = 0;
  let peak = 0;
  const starts: number[] = [];
  const t0 = Date.now();
  await Promise.all(
    Array.from({ length: 10 }, () =>
      limiter.run(async () => {
        starts.push(Date.now() - t0);
        active++;
        peak = Math.max(peak, active);
        await sleep(30);
        active--;
      })
    )
  );
  assert.ok(peak <= 3, `peak ${peak}`);
  // 10 starts, >= 20ms apart => last start >= ~180ms
  assert.ok(starts[9] >= 170, `last start at ${starts[9]}`);
});

test("limiter keeps going after a task fails", async () => {
  const limiter = createLimiter({ maxConcurrent: 1, minIntervalMs: 0 });
  await assert.rejects(limiter.run(async () => { throw new Error("x"); }));
  assert.equal(await limiter.run(async () => 42), 42);
});

test("withRetry retries 429 honouring Retry-After, not 404", async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls++;
    if (calls < 3) throw { response: { status: 429, headers: { "retry-after": "0" } } };
    return "ok";
  });
  assert.equal(result, "ok");
  assert.equal(calls, 3);

  let notFoundCalls = 0;
  await assert.rejects(
    withRetry(async () => {
      notFoundCalls++;
      throw { response: { status: 404 } };
    })
  );
  assert.equal(notFoundCalls, 1);
});

test("withRetry gives up after `retries`", async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(async () => { calls++; throw { response: { status: 503 } }; }, { retries: 2, baseDelayMs: 1 })
  );
  assert.equal(calls, 3);
});

test("TtlCache de-duplicates concurrent loads and doesn't cache failures", async () => {
  const cache = new TtlCache<number>(1000);
  let loads = 0;
  const load = async () => { loads++; await sleep(10); return 7; };
  const values = await Promise.all([cache.getOrLoad("a", load), cache.getOrLoad("a", load), cache.getOrLoad("a", load)]);
  assert.deepEqual(values, [7, 7, 7]);
  assert.equal(loads, 1);

  let failLoads = 0;
  await assert.rejects(cache.getOrLoad("b", async () => { failLoads++; throw new Error("tmdb down"); }));
  await sleep(0);
  assert.equal(await cache.getOrLoad("b", async () => { failLoads++; return 1; }), 1);
  assert.equal(failLoads, 2);
});

test("TtlCache expires and caps size", async () => {
  const cache = new TtlCache<number>(20, 2);
  let loads = 0;
  const load = async () => ++loads;
  await cache.getOrLoad("a", load);
  await sleep(30);
  await cache.getOrLoad("a", load);
  assert.equal(loads, 2);
  await cache.getOrLoad("b", load);
  await cache.getOrLoad("c", load);
  assert.equal(cache.size, 2);
});

test("processWithinBudget stops starting work after the deadline", async () => {
  const items = Array.from({ length: 50 }, (_, i) => i);
  const { processed, stoppedEarly } = await processWithinBudget(
    items,
    async (i) => { await sleep(10); return i; },
    { concurrency: 2, deadline: Date.now() + 55 }
  );
  assert.ok(stoppedEarly);
  assert.ok(processed > 0 && processed < 50, `processed ${processed}`);

  const all = await processWithinBudget(items, async (i) => i, { concurrency: 4, deadline: Date.now() + 10_000 });
  assert.equal(all.processed, 50);
  assert.equal(all.stoppedEarly, false);
});
