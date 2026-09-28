import assert from "node:assert/strict";
import { test } from "node:test";

import { movieToEntryData, seasonToEntryData, seasonTitle, DEFAULT_EPISODE_RUNTIME } from "../src/helpers/entryData";
import { computeUserStats, entryFigures } from "../src/helpers/statsEngine";
import { parseMediaId } from "../src/Interfaces/media";
import type { TmdbMovieDetailWithExtras, TmdbSeasonDetailWithExtras, TmdbShowDetailWithExtras, TmdbEpisode } from "../src/Interfaces/tmdb";
import type { StatsInputEntry } from "../src/Interfaces/stats";

const movie = (over: Partial<TmdbMovieDetailWithExtras> = {}): TmdbMovieDetailWithExtras => ({
  id: 550, adult: false, backdrop_path: null, belongs_to_collection: null, budget: 0,
  genres: [{ id: 18, name: "Drama" }], homepage: null, imdb_id: null,
  original_language: "en", original_title: "Fight Club", overview: "", popularity: 1,
  poster_path: "/p.jpg", production_companies: [{ id: 1, name: "Fox", logo_path: null, origin_country: "US" }],
  production_countries: [{ iso_3166_1: "US", name: "United States" }], release_date: "1999-10-15",
  revenue: 0, runtime: 139, spoken_languages: [], status: "Released", tagline: null, title: "Fight Club",
  video: false, vote_average: 8.4, vote_count: 100,
  keywords: { keywords: [{ id: 1, name: "twist" }] },
  credits: {
    cast: [{ id: 287, name: "Brad Pitt", profile_path: null, character: "Tyler", order: 0, adult: false, gender: 2, known_for_department: "Acting", original_name: "", popularity: 1, credit_id: "a" }],
    crew: [
      { id: 7467, name: "David Fincher", profile_path: null, job: "Director", department: "Directing", adult: false, gender: 2, known_for_department: "Directing", original_name: "", popularity: 1, credit_id: "b" },
      { id: 7467, name: "David Fincher", profile_path: null, job: "Producer", department: "Production", adult: false, gender: 2, known_for_department: "Directing", original_name: "", popularity: 1, credit_id: "c" },
    ],
  },
  ...over,
});

const ep = (n: number, runtime: number | null): TmdbEpisode => ({
  id: n, name: `E${n}`, overview: "", vote_average: 0, vote_count: 0, air_date: n === 1 ? "2012-04-01" : null,
  episode_number: n, production_code: "", runtime, season_number: 2, show_id: 1399, still_path: null,
});

const show = (over: Partial<TmdbShowDetailWithExtras> = {}): TmdbShowDetailWithExtras => ({
  id: 1399, adult: false, backdrop_path: "/b.jpg", created_by: [], episode_run_time: [], first_air_date: "2011-04-17",
  genres: [{ id: 18, name: "Drama" }, { id: 10765, name: "Sci-Fi & Fantasy" }], homepage: null, in_production: false,
  languages: ["en"], last_air_date: null, last_episode_to_air: null, name: "Game of Thrones", next_episode_to_air: null,
  networks: [], number_of_episodes: 73, number_of_seasons: 8, origin_country: ["US"], original_language: "en",
  original_name: "Game of Thrones", overview: "", popularity: 1, poster_path: "/show.jpg", production_companies: [],
  production_countries: [{ iso_3166_1: "US", name: "United States" }],
  seasons: [{ id: 3625, air_date: "2012-04-01", episode_count: 10, name: "Season 2", overview: "", poster_path: null, season_number: 2, vote_average: 8 }],
  spoken_languages: [], status: "Ended", tagline: null, type: "Scripted", vote_average: 8.5, vote_count: 1,
  keywords: { results: [{ id: 9, name: "dragon" }] },
  ...over,
});

const season = (episodes: TmdbEpisode[], over: Partial<TmdbSeasonDetailWithExtras> = {}): TmdbSeasonDetailWithExtras => ({
  id: 3625, air_date: null, episodes, name: "Season 2", overview: "", poster_path: "/s2.jpg", season_number: 2, vote_average: 0, ...over,
});

test("parseMediaId", () => {
  assert.deepEqual(parseMediaId("movie", "550"), { kind: "movie", movieId: "550" });
  assert.deepEqual(parseMediaId("tv", "1399-2"), { kind: "season", showId: "1399", seasonNumber: 2 });
  assert.deepEqual(parseMediaId("tv", "1399-0"), { kind: "season", showId: "1399", seasonNumber: 0 });
  assert.deepEqual(parseMediaId("tv", "1399"), { kind: "show", showId: "1399" });
});

test("movie normalisation handles null/0 runtime, empty date, missing origin_country", () => {
  const d = movieToEntryData(movie({ runtime: 0, release_date: "" }));
  assert.equal(d.kind, "movie");
  assert.equal(d.runtime, null);
  assert.equal(d.total_runtime, null);
  assert.equal(d.release_date, null);
  assert.equal(d.number_of_episodes, 1);
  assert.deepEqual(d.origin_country, ["US"]); // from production_countries
  assert.equal(d.crew.length, 1); // Fincher de-duplicated
  assert.deepEqual(d.genres, [{ id: "18", name: "Drama" }]);
  assert.deepEqual(d.tags, [{ id: "1", name: "twist" }]);
});

test("season normalisation fills missing episode runtimes with the season average", () => {
  const d = seasonToEntryData(show(), season([ep(1, 50), ep(2, null), ep(3, 60), ep(4, 0)]));
  assert.equal(d.kind, "season");
  assert.equal(d.show_id, "1399");
  assert.equal(d.number_of_episodes, 4);
  assert.deepEqual(d.episode_runtimes, [50, 55, 60, 55]);
  assert.equal(d.runtime, 55);
  assert.equal(d.total_runtime, 220);
  assert.equal(d.release_date, "2012-04-01"); // from first episode
  assert.equal(d.vote_average, 8.5); // season 0 -> show score
  assert.equal(seasonTitle(show(), season([])), "Game of Thrones - Season 2");
});

test("season with no episodes listed yet uses the show's season summary", () => {
  const d = seasonToEntryData(show(), season([]));
  assert.equal(d.number_of_episodes, 10);
  assert.equal(d.runtime, null);
  assert.equal(d.total_runtime, null);
  assert.deepEqual(d.episode_runtimes, Array(10).fill(DEFAULT_EPISODE_RUNTIME));
  assert.equal(d.release_date, "2012-04-01");
});

test("season falls back to show.episode_run_time", () => {
  const d = seasonToEntryData(show({ episode_run_time: [30, 40] }), season([ep(1, null), ep(2, null)]));
  assert.equal(d.runtime, 35);
  assert.deepEqual(d.episode_runtimes, [35, 35]);
});

const movieData = movieToEntryData(movie());
const seasonData = seasonToEntryData(show(), season([ep(1, 50), ep(2, 60), ep(3, 70)]));

const e = (over: Partial<StatsInputEntry>): StatsInputEntry => ({
  mediaType: "movie", mediaid: "550", status: "completed", title: "T", poster: null, data: movieData, ...over,
});

test("entry figures", () => {
  // completed with legacy progress 0 still counts as fully watched
  const f = entryFigures("movie", e({ progress: 0 }))!;
  assert.equal(f.minutesWatched, 139);
  // season partially watched: uses exact episode runtimes
  const s = entryFigures("tv", e({ mediaType: "tv", mediaid: "1399-2", status: "watching", progress: 2, data: seasonData }))!;
  assert.equal(s.minutesWatched, 110);
  // rewatch adds full length
  const r = entryFigures("tv", e({ mediaType: "tv", status: "completed", rewatches: 1, data: seasonData }))!;
  assert.equal(r.minutesWatched, 360);
  assert.equal(r.unitsWatched, 6);
  // progress above total is clamped
  const c = entryFigures("tv", e({ mediaType: "tv", status: "watching", progress: 99, data: seasonData }))!;
  assert.equal(c.progress, 3);
  // unknown status ignored
  assert.equal(entryFigures("movie", e({ status: "droppe" })), null);
});

test("computeUserStats end to end, incl. legacy and missing data", () => {
  const legacySeason = { runtime: 45, number_of_episodes: 8, release_date: "", genres: [{ id: "18", name: "Drama" }], origin_country: ["GB"] };
  const stats = computeUserStats([
    e({ score: 8, endDate: "2024-05-01T00:00:00Z" }),
    e({ mediaid: "551", score: 0, status: "dropped", progress: 1 }),       // unscored
    e({ mediaid: "552", status: "planning", data: movieToEntryData(movie({ runtime: null })) }),
    e({ mediaid: "553", data: null, score: 6 }),                         // no TMDB data at all
    e({ mediaType: "tv", mediaid: "1399-2", status: "completed", score: 9, data: seasonData, endDate: "2023-01-02" }),
    e({ mediaType: "tv", mediaid: "1-1", status: "watching", progress: 4, data: legacySeason as any, startDate: "2025-02-02" }),
    e({ mediaType: "anime" as any }),                                    // unknown media type ignored
  ]);

  const m = stats.movie.overview;
  assert.equal(m.count, 3);                 // planning excluded
  assert.equal(m.meanScore, 7);             // (8 + 6) / 2, unscored ignored
  assert.equal(m.standardDeviation, 1);
  // 139 + 139 + 100 (default runtime for no data) minutes
  assert.equal(m.daysWatched, Number(((139 * 2 + 100) / 1440).toFixed(2)));
  assert.equal(m.daysPlanned, Number((100 / 1440).toFixed(2)));
  assert.deepEqual(m.statusDist.map((d) => d.format).sort(), ["completed", "dropped", "planning"]);
  assert.deepEqual(m.watchYear.map((d) => d.format), ["2024"]);
  assert.deepEqual(m.countryDist, [{ format: "US", count: 2, hoursWatched: Number((278 / 60).toFixed(2)), meanScore: 8 }]);

  const crew = stats.movie.other.filter((o) => o.type === "crew");
  assert.equal(crew.length, 1);
  assert.equal(crew[0].count, 2);          // Fincher counted once per movie, not twice

  const t = stats.tv.overview;
  assert.equal(t.count, 2);
  assert.equal(t.episodesWatched, 3 + 4);
  assert.equal(t.meanScore, 9);
  assert.equal(t.daysWatched, Number(((180 + 4 * 45) / 1440).toFixed(2)));
  assert.deepEqual(t.releaseYear.map((d) => d.format), ["2012"]); // legacy "" skipped
  assert.deepEqual(t.watchYear.map((d) => d.format), ["2023", "2025"]);
  const drama = stats.tv.other.find((o) => o.type === "genre" && o.statTypeId === "18")!;
  assert.equal(drama.count, 2);
  assert.equal(drama.meanScore, 9);

  // no NaN / Infinity anywhere
  const walk = (v: unknown): void => {
    if (typeof v === "number") assert.ok(Number.isFinite(v), "found non-finite number");
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(stats);
});

test("empty list gives zeroed stats", () => {
  const s = computeUserStats([]);
  assert.equal(s.movie.overview.count, 0);
  assert.equal(s.movie.overview.meanScore, 0);
  assert.deepEqual(s.tv.other, []);
});
