/**
 * App-level ("MovieList") media types.
 *
 * How TMDB things map onto list entries:
 *
 *   TMDB movie   ->  trackable. mediaType "movie", mediaid "550"
 *   TMDB show    ->  NOT trackable. Only a detail page that lists its seasons.
 *   TMDB season  ->  trackable. mediaType "tv",    mediaid "1399-2" (showId-seasonNumber)
 *
 * `mediaType` stays "movie" | "tv" because that's what is already stored in
 * Mongo and used in URLs. `kind` inside EntryData says precisely what the
 * entry is ("movie" | "season").
 */

/* ------------------------------------------------------------------ */
/* Media type / ids                                                    */
/* ------------------------------------------------------------------ */

export const MEDIA_TYPES = ["movie", "tv"] as const;
/** The only media types that can live in a list / have stats. */
export type MediaType = (typeof MEDIA_TYPES)[number];

export const isMediaType = (value: unknown): value is MediaType =>
  typeof value === "string" && (MEDIA_TYPES as readonly string[]).includes(value);

/** What a list entry actually points at. */
export type EntryKind = "movie" | "season";

export type ParsedMediaId =
  | { kind: "movie"; movieId: string }
  | { kind: "season"; showId: string; seasonNumber: number }
  | { kind: "show"; showId: string };

/**
 * "550" (movie)  -> { kind: "movie", movieId: "550" }
 * "1399-2" (tv)  -> { kind: "season", showId: "1399", seasonNumber: 2 }
 * "1399" (tv)    -> { kind: "show", showId: "1399" }   (not trackable)
 */
export const parseMediaId = (mediaType: MediaType, mediaid: string): ParsedMediaId => {
  if (mediaType === "movie") return { kind: "movie", movieId: mediaid };

  const [showId, seasonPart] = mediaid.split("-");
  const seasonNumber = Number.parseInt(seasonPart ?? "", 10);
  if (Number.isNaN(seasonNumber)) return { kind: "show", showId };
  return { kind: "season", showId, seasonNumber };
};

export const buildSeasonMediaId = (showId: string | number, seasonNumber: number) =>
  `${showId}-${seasonNumber}`;

/* ------------------------------------------------------------------ */
/* List status                                                         */
/* ------------------------------------------------------------------ */

export const LIST_STATUSES = [
  "watching",
  "rewatching",
  "completed",
  "paused",
  "dropped",
  "planning",
] as const;
export type ListStatus = (typeof LIST_STATUSES)[number];

export const isListStatus = (value: unknown): value is ListStatus =>
  typeof value === "string" && (LIST_STATUSES as readonly string[]).includes(value);

/* ------------------------------------------------------------------ */
/* EntryData: the normalised snapshot stored on every list entry       */
/* ------------------------------------------------------------------ */

/** Genres, tags, companies. ids are strings because that's how Mongo stores them. */
export type EntryRef = { id: string; name: string };

export type EntryPerson = {
  id: string;
  name: string;
  profile_path: string | null;
  /** cast only */
  character?: string;
  /** crew only */
  job?: string;
};

export type EntryCountry = { iso_3166_1: string; name: string };

/**
 * One shape for BOTH movies and seasons. Every field is always present and
 * already "cleaned": unknown values are `null` or `[]`, never `undefined`/"".
 *
 * Field names stay snake_case so existing Mongo documents and frontend code
 * (`entry.data.number_of_episodes`, `entry.data.genres`, ...) keep working.
 */
export type EntryData = {
  kind: EntryKind;
  /** seasons only */
  show_id: string | null;
  /** seasons only */
  season_number: number | null;

  adult: boolean;
  /** TMDB status of the movie / parent show ("Released", "Returning Series", ...) */
  status: string | null;
  /** movie release date, or season air date (falls back to first episode's) */
  release_date: string | null;

  /** Units the user can progress through: 1 for movies, episode count for seasons. */
  number_of_episodes: number;
  /** Minutes per unit (movie runtime or average episode runtime). null = unknown. */
  runtime: number | null;
  /** Seasons only: minutes of each episode, with unknown ones filled by an estimate. */
  episode_runtimes: number[];
  /** Minutes for the whole movie / season. null = unknown. */
  total_runtime: number | null;

  /** TMDB community score (0-10). NOT the user's score. */
  vote_average: number | null;

  origin_country: string[];
  production_countries: EntryCountry[];
  original_language: string | null;
  genres: EntryRef[];
  production_companies: EntryRef[];
  tags: EntryRef[];
  cast: EntryPerson[];
  crew: EntryPerson[];
};

/**
 * Entries saved before EntryData existed are missing most fields.
 * Anything reading `entry.data` from the DB should treat it as this type.
 */
export type StoredEntryData = Partial<EntryData> | null | undefined;
