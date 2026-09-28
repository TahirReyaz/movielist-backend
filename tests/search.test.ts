import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildDiscoverParams,
  matchesFilters,
  searchMediaPage,
  seasonDateRange,
  seasonOfDate,
} from "../src/helpers/search";

test("seasons follow AniList: winter Jan-Mar ... fall Oct-Dec", () => {
  assert.equal(seasonOfDate("2024-02-10"), "winter");
  assert.equal(seasonOfDate("2024-05-01"), "spring");
  assert.equal(seasonOfDate("2024-09-30"), "summer");
  assert.equal(seasonOfDate("2024-12-31"), "fall");
  assert.equal(seasonOfDate(""), null);
  assert.deepEqual(seasonDateRange(2024, "winter"), { gte: "2024-01-01", lte: "2024-03-31" });
  assert.deepEqual(seasonDateRange(2023, "winter"), { gte: "2023-01-01", lte: "2023-03-31" });
  assert.deepEqual(seasonDateRange(2024, "fall"), { gte: "2024-10-01", lte: "2024-12-31" });
});

test("discover params put every filter on TMDB's side", () => {
  assert.deepEqual(buildDiscoverParams("tv", { page: 2, year: 2020, season: "summer", genres: [18, 80] }), {
    page: 2, include_adult: false, sort_by: "popularity.desc", with_genres: "18,80",
    "first_air_date.gte": "2020-07-01", "first_air_date.lte": "2020-09-30",
  });
  const movie = buildDiscoverParams("movie", { page: 1, year: 1999 });
  assert.equal(movie.primary_release_year, 1999);
});

test("matchesFilters", () => {
  const item: any = { genre_ids: [18, 80], release_date: "2019-08-01" };
  assert.ok(matchesFilters(item, { genres: [18], season: "summer", year: 2019 }));
  assert.ok(!matchesFilters(item, { genres: [18, 35] }));
  assert.ok(!matchesFilters(item, { season: "fall" }));
  assert.ok(!matchesFilters({ genre_ids: [], release_date: "" } as any, { season: "fall" }));
});

// ---- fake TMDB ----
const calls: string[] = [];
const fakeResults = (page: number, n = 20) =>
  Array.from({ length: n }, (_, i) => ({
    id: page * 100 + i,
    title: `M${page}-${i}`,
    release_date: "2020-01-01",
    genre_ids: i % 5 === 0 ? [18] : [35], // 4 of every 20 are drama
    original_language: "en",
  }));
(globalThis as any).__tmdbGet = async (url: string, config: any) => {
  const p = config?.params ?? {};
  calls.push(`${url}?page=${p.page}`);
  return { data: { page: p.page, results: fakeResults(p.page), total_pages: 7, total_results: 140 } };
};

test("plain text search = exactly 1 TMDB request per page", async () => {
  calls.length = 0;
  const r = await searchMediaPage("movie", { query: "matrix", page: 1 });
  assert.equal(calls.length, 1);
  assert.equal(r.results.length, 20);
  assert.equal(r.nextPage, 2);
});

test("discover (no text) = 1 request, last page has no next", async () => {
  calls.length = 0;
  const r = await searchMediaPage("tv", { page: 7, genres: [18] });
  assert.deepEqual(calls, ["/discover/tv?page=7"]);
  assert.equal(r.nextPage, null);
});

test("text + genre filter reads at most 3 pages and continues without gaps", async () => {
  calls.length = 0;
  const r1 = await searchMediaPage("movie", { query: "x", page: 1, genres: [18] });
  assert.equal(calls.length, 3);             // 3 x 4 matches = 12 (< 20), capped at 3 requests
  assert.equal(r1.results.length, 12);
  assert.equal(r1.nextPage, 4);
  const r2 = await searchMediaPage("movie", { query: "x", page: r1.nextPage!, genres: [18] });
  assert.equal(r2.nextPage, 7);
  const r3 = await searchMediaPage("movie", { query: "x", page: r2.nextPage!, genres: [18] });
  assert.equal(r3.nextPage, null);            // page 7 was the last
  const pagesRead = calls.map((c) => Number(c.split("page=")[1]));
  assert.deepEqual(pagesRead, [1, 2, 3, 4, 5, 6, 7]);
});

test("repeated identical searches hit the cache", async () => {
  calls.length = 0;
  await searchMediaPage("movie", { query: "matrix", page: 1 });
  assert.equal(calls.length, 0);
});

test("anime is removed", async () => {
  (globalThis as any).__tmdbGet = async () => ({
    data: { page: 1, results: [{ id: 1, genre_ids: [16], original_language: "ja", release_date: "" }, { id: 2, genre_ids: [16], original_language: "en", release_date: "" }], total_pages: 1, total_results: 2 },
  });
  const r = await searchMediaPage("movie", { query: "anime-test", page: 1 });
  assert.deepEqual(r.results.map((x) => x.id), [2]);
});
