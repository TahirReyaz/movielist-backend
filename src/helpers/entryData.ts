/**
 * Pure functions that turn raw TMDB responses into `EntryData`.
 * No network, no Mongo – easy to unit test.
 */
import {
  TmdbCastCredit,
  TmdbCrewCredit,
  TmdbMovieDetailWithExtras,
  TmdbSeasonDetailWithExtras,
  TmdbShowDetailWithExtras,
} from "../Interfaces/tmdb";
import { EntryData, EntryPerson, EntryRef } from "../Interfaces/media";

/** Used when TMDB has no runtime at all for an episode / show. */
export const DEFAULT_EPISODE_RUNTIME = 45;
/** Used when TMDB has no runtime for a movie. */
export const DEFAULT_MOVIE_RUNTIME = 100;

const MAX_TAGS = 20;
const MAX_PEOPLE = 20;

/* ------------------------------------------------------------------ */
/* Tiny cleaners                                                       */
/* ------------------------------------------------------------------ */

/** A positive finite number, else null. Turns TMDB's 0 / null / NaN into null. */
export const positiveOrNull = (n: unknown): number | null =>
  typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;

/** A usable date string, else null. Handles "", null, and garbage. */
export const dateOrNull = (d: unknown): string | null => {
  if (typeof d !== "string" || d.trim() === "") return null;
  return Number.isNaN(new Date(d).getTime()) ? null : d;
};

const average = (nums: number[]): number | null =>
  nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;

const round = (n: number, digits = 2) => Number(n.toFixed(digits));

const toRefs = (items: { id: number; name: string }[] | undefined, limit?: number): EntryRef[] =>
  (items ?? []).slice(0, limit).map(({ id, name }) => ({ id: String(id), name }));

/** Same person can appear several times (e.g. Director + Writer). Keep the first. */
const uniqueById = <T extends { id: number }>(people: T[]): T[] => {
  const seen = new Set<number>();
  return people.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
};

const toCast = (cast: TmdbCastCredit[] | undefined): EntryPerson[] =>
  uniqueById(cast ?? [])
    .slice(0, MAX_PEOPLE)
    .map((c) => ({
      id: String(c.id),
      name: c.name,
      profile_path: c.profile_path ?? null,
      character: c.character,
    }));

const toCrew = (crew: TmdbCrewCredit[] | undefined): EntryPerson[] =>
  uniqueById(crew ?? [])
    .slice(0, MAX_PEOPLE)
    .map((c) => ({
      id: String(c.id),
      name: c.name,
      profile_path: c.profile_path ?? null,
      job: c.job,
    }));

/* ------------------------------------------------------------------ */
/* Movie                                                               */
/* ------------------------------------------------------------------ */

export const movieToEntryData = (movie: TmdbMovieDetailWithExtras): EntryData => {
  const runtime = positiveOrNull(movie.runtime);
  const productionCountries = movie.production_countries ?? [];

  // `origin_country` is newer on the movie endpoint; fall back to production countries.
  const originCountry =
    movie.origin_country && movie.origin_country.length > 0
      ? movie.origin_country
      : productionCountries.map((c) => c.iso_3166_1);

  return {
    kind: "movie",
    show_id: null,
    season_number: null,
    adult: !!movie.adult,
    status: movie.status || null,
    release_date: dateOrNull(movie.release_date),
    number_of_episodes: 1,
    runtime,
    episode_runtimes: [],
    total_runtime: runtime,
    vote_average: positiveOrNull(movie.vote_average),
    origin_country: originCountry,
    production_countries: productionCountries.map(({ iso_3166_1, name }) => ({ iso_3166_1, name })),
    original_language: movie.original_language || null,
    genres: toRefs(movie.genres),
    production_companies: toRefs(movie.production_companies),
    tags: toRefs(movie.keywords?.keywords, MAX_TAGS),
    cast: toCast(movie.credits?.cast),
    crew: toCrew(movie.credits?.crew),
  };
};

/* ------------------------------------------------------------------ */
/* Season                                                              */
/* ------------------------------------------------------------------ */

/**
 * Best guess for "how long is an episode of this season", in order:
 *  1. average of the season's episodes that have a runtime
 *  2. show.episode_run_time (older shows)
 *  3. show.last_episode_to_air.runtime
 *  4. null (caller decides the default)
 */
export const estimateEpisodeRuntime = (
  show: TmdbShowDetailWithExtras,
  season: TmdbSeasonDetailWithExtras
): number | null => {
  const known = (season.episodes ?? [])
    .map((e) => positiveOrNull(e.runtime))
    .filter((n): n is number => n !== null);

  return (
    average(known) ??
    average((show.episode_run_time ?? []).filter((n) => n > 0)) ??
    positiveOrNull(show.last_episode_to_air?.runtime) ??
    null
  );
};

export const seasonToEntryData = (
  show: TmdbShowDetailWithExtras,
  season: TmdbSeasonDetailWithExtras
): EntryData => {
  const episodes = season.episodes ?? [];

  // Episode count: the season detail lists episodes; if TMDB hasn't added them
  // yet, fall back to the count in the show's season summary.
  const summary = show.seasons?.find((s) => s.season_number === season.season_number);
  const numberOfEpisodes = episodes.length || summary?.episode_count || 0;

  const estimate = estimateEpisodeRuntime(show, season);
  const fillValue = estimate ?? DEFAULT_EPISODE_RUNTIME;

  const episodeRuntimes: number[] =
    episodes.length > 0
      ? episodes.map((e) => positiveOrNull(e.runtime) ?? fillValue)
      : Array.from({ length: numberOfEpisodes }, () => fillValue);

  const totalRuntime =
    estimate === null ? null : episodeRuntimes.reduce((a, b) => a + b, 0);

  const releaseDate =
    dateOrNull(season.air_date) ??
    dateOrNull(episodes[0]?.air_date) ??
    dateOrNull(summary?.air_date);

  const productionCountries = show.production_countries ?? [];

  return {
    kind: "season",
    show_id: String(show.id),
    season_number: season.season_number,
    adult: !!show.adult,
    status: show.status || null,
    release_date: releaseDate,
    number_of_episodes: numberOfEpisodes,
    runtime: estimate === null ? null : round(estimate),
    episode_runtimes: episodeRuntimes,
    total_runtime: totalRuntime === null ? null : round(totalRuntime),
    vote_average: positiveOrNull(season.vote_average) ?? positiveOrNull(show.vote_average),
    origin_country:
      show.origin_country?.length > 0
        ? show.origin_country
        : productionCountries.map((c) => c.iso_3166_1),
    production_countries: productionCountries.map(({ iso_3166_1, name }) => ({ iso_3166_1, name })),
    original_language: show.original_language || null,
    genres: toRefs(show.genres),
    production_companies: toRefs(show.production_companies),
    tags: toRefs(show.keywords?.results, MAX_TAGS),
    cast: toCast(season.credits?.cast),
    crew: toCrew(season.credits?.crew),
  };
};

/** Display title for a season entry, e.g. "Game of Thrones - Season 2". */
export const seasonTitle = (
  show: Pick<TmdbShowDetailWithExtras, "name">,
  season: Pick<TmdbSeasonDetailWithExtras, "name">
) => `${show.name} - ${season.name}`;

/* ------------------------------------------------------------------ */
/* Helpers for reading stored EntryData (may be legacy / partial)      */
/* ------------------------------------------------------------------ */

/**
 * How many units the entry has: 1 for movies, episode count for seasons.
 * Returns null when a season's episode count is unknown (e.g. unannounced).
 */
export const getTotalUnits = (
  mediaType: string,
  // Loose on purpose: accepts EntryData, legacy data, or a Mongoose subdocument.
  data: { number_of_episodes?: number | null } | null | undefined
): number | null => {
  if (mediaType === "movie") return 1;
  return positiveOrNull(data?.number_of_episodes);
};

/** Clamp a user-supplied progress into [0, totalUnits]. */
export const clampProgress = (progress: unknown, totalUnits: number | null): number => {
  const n = typeof progress === "number" ? progress : Number(progress);
  if (!Number.isFinite(n) || n < 0) return 0;
  const whole = Math.floor(n);
  return totalUnits === null ? whole : Math.min(whole, totalUnits);
};
