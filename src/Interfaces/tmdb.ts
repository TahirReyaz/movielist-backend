/**
 * Raw TMDB response shapes.
 *
 * These describe what TMDB *actually* sends back, including the fields that
 * are frequently null / empty. Never store these directly on a list entry –
 * normalise them into `EntryData` first (see helpers/entryData.ts).
 *
 * Rules of thumb for TMDB data:
 *  - image paths (`poster_path`, `backdrop_path`, `profile_path`, `still_path`) can be null
 *  - dates are "YYYY-MM-DD" strings, but can be "" or null for unreleased things
 *  - `runtime` can be null OR 0 when unknown
 *  - ids are numbers
 */

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                 */
/* ------------------------------------------------------------------ */

export type TmdbGenre = { id: number; name: string };
export type TmdbKeyword = { id: number; name: string };

export type TmdbProductionCompany = {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
};

export type TmdbProductionCountry = { iso_3166_1: string; name: string };

export type TmdbSpokenLanguage = {
  english_name: string;
  iso_639_1: string;
  name: string;
};

export type TmdbNetwork = {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
};

export type TmdbCollectionRef = {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
};

export type TmdbShowCreator = {
  id: number;
  credit_id: string;
  name: string;
  gender: number;
  profile_path: string | null;
};

/* ------------------------------------------------------------------ */
/* People / credits                                                    */
/* ------------------------------------------------------------------ */

export type TStaffExternalLinks = {
  imdb_id?: string | null;
  wikidata_id?: string | null;
  facebook_id?: string | null;
  instagram_id?: string | null;
  youtube_id?: string | null;
  twitter_id?: string | null;
};

export interface IStaffDetails {
  adult: boolean;
  also_known_as: string[];
  biography: string;
  birthday: string | null;
  deathday: string | null;
  gender: number;
  homepage: string | null;
  id: number;
  imdb_id: string | null;
  known_for_department: string;
  name: string;
  place_of_birth: string | null;
  popularity: number;
  profile_path: string | null;
  external_ids?: TStaffExternalLinks;
}

/** Fields every credit (cast or crew) has. */
type TmdbCreditBase = {
  adult: boolean;
  gender: number;
  id: number;
  known_for_department: string;
  name: string;
  original_name: string;
  popularity: number;
  profile_path: string | null;
  credit_id: string;
};

export type TmdbCastCredit = TmdbCreditBase & {
  character: string;
  order: number;
  /** movies only */
  cast_id?: number;
};

export type TmdbCrewCredit = TmdbCreditBase & {
  department: string;
  job: string;
};

export type TmdbCredits = {
  cast: TmdbCastCredit[];
  crew: TmdbCrewCredit[];
};

/* ------------------------------------------------------------------ */
/* Movie                                                               */
/* ------------------------------------------------------------------ */

export type TmdbMovieDetail = {
  id: number;
  adult: boolean;
  backdrop_path: string | null;
  belongs_to_collection: TmdbCollectionRef | null;
  budget: number;
  genres: TmdbGenre[];
  homepage: string | null;
  imdb_id: string | null;
  /** Added to the movie endpoint by TMDB in 2024 – may be missing on cached data */
  origin_country?: string[];
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  production_companies: TmdbProductionCompany[];
  production_countries: TmdbProductionCountry[];
  release_date: string; // may be ""
  revenue: number;
  runtime: number | null; // may be 0 or null
  spoken_languages: TmdbSpokenLanguage[];
  status: string; // "Released" | "Post Production" | ...
  tagline: string | null;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
};

/** `movie/{id}?append_to_response=keywords,credits` */
export type TmdbMovieDetailWithExtras = TmdbMovieDetail & {
  keywords?: { keywords: TmdbKeyword[] };
  credits?: TmdbCredits;
};

/* ------------------------------------------------------------------ */
/* TV show / season / episode                                          */
/* ------------------------------------------------------------------ */

export type TmdbEpisode = {
  id: number;
  name: string;
  overview: string;
  vote_average: number;
  vote_count: number;
  air_date: string | null;
  episode_number: number;
  episode_type?: string;
  production_code: string;
  runtime: number | null; // null for unaired episodes
  season_number: number;
  show_id: number;
  still_path: string | null;
  crew?: TmdbCrewCredit[];
  guest_stars?: TmdbCastCredit[];
};

/** A season as it appears inside `tv/{id}` -> `seasons[]` */
export type TmdbSeasonSummary = {
  id: number;
  air_date: string | null;
  episode_count: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  vote_average: number;
};

export type TmdbShowDetail = {
  id: number;
  adult: boolean;
  backdrop_path: string | null;
  created_by: TmdbShowCreator[];
  /** Often an empty array on newer shows */
  episode_run_time: number[];
  first_air_date: string | null;
  genres: TmdbGenre[];
  homepage: string | null;
  in_production: boolean;
  languages: string[];
  last_air_date: string | null;
  last_episode_to_air: TmdbEpisode | null;
  name: string;
  next_episode_to_air: TmdbEpisode | null;
  networks: TmdbNetwork[];
  number_of_episodes: number;
  number_of_seasons: number;
  origin_country: string[];
  original_language: string;
  original_name: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  production_companies: TmdbProductionCompany[];
  production_countries: TmdbProductionCountry[];
  seasons: TmdbSeasonSummary[];
  spoken_languages: TmdbSpokenLanguage[];
  status: string; // "Returning Series" | "Ended" | "Canceled" | ...
  tagline: string | null;
  /** "Scripted" | "Documentary" | "Miniseries" | ... (NOT our media type) */
  type: string;
  vote_average: number;
  vote_count: number;
};

/** `tv/{id}?append_to_response=keywords` */
export type TmdbShowDetailWithExtras = TmdbShowDetail & {
  keywords?: { results: TmdbKeyword[] };
};

/** `tv/{id}/season/{n}` */
export type TmdbSeasonDetail = {
  _id?: string;
  id: number;
  air_date: string | null;
  episodes: TmdbEpisode[];
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  vote_average: number;
};

/** `tv/{id}/season/{n}?append_to_response=credits` */
export type TmdbSeasonDetailWithExtras = TmdbSeasonDetail & {
  credits?: TmdbCredits;
};

/* ------------------------------------------------------------------ */
/* List / search results                                               */
/* ------------------------------------------------------------------ */

type TmdbListItemBase = {
  id: number;
  adult: boolean;
  backdrop_path: string | null;
  genre_ids: number[];
  original_language: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
};

export type TmdbMovieListItem = TmdbListItemBase & {
  media_type?: "movie";
  original_title: string;
  release_date: string;
  title: string;
  video: boolean;
};

export type TmdbShowListItem = TmdbListItemBase & {
  media_type?: "tv";
  first_air_date: string;
  name: string;
  origin_country: string[];
  original_name: string;
};

/* ------------------------------------------------------------------ */
/* Legacy names – kept so existing imports keep compiling.             */
/* Prefer the Tmdb* names above in new code.                           */
/* ------------------------------------------------------------------ */

/** @deprecated use TmdbMovieDetail */
export type TMovie = TmdbMovieDetail;
/** @deprecated use TmdbShowDetail */
export type TTV = TmdbShowDetail;
/** @deprecated use TmdbSeasonDetail */
export type ISeason = TmdbSeasonDetail;
/** @deprecated use TmdbSeasonSummary */
export type ITVSeason = TmdbSeasonSummary;
/** @deprecated use TmdbEpisode */
export type TEpisode = TmdbEpisode;
/** @deprecated use TmdbCastCredit */
export type ICastMember = TmdbCastCredit;
/** @deprecated use TmdbCrewCredit */
export type ICrewMember = TmdbCrewCredit;
/** @deprecated use TmdbGenre */
export type TMediaDetailGenre = TmdbGenre;
/** @deprecated use TmdbNetwork */
export type TNetwork = TmdbNetwork;
/** @deprecated use TmdbProductionCompany */
export type TProductionCompany = TmdbProductionCompany;
/** @deprecated use TmdbProductionCountry */
export type TProductionCountry = TmdbProductionCountry;
/** @deprecated use TmdbSpokenLanguage */
export type TLanguage = TmdbSpokenLanguage;
/** @deprecated use TmdbCollectionRef */
export type ICollectionInMedia = TmdbCollectionRef;
/** @deprecated use TmdbShowCreator */
export type TTVCreator = TmdbShowCreator;
