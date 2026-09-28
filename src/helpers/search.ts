/**
 * Movie / TV search that costs 1 TMDB request per page in the common case
 * (max MAX_SEARCH_PAGES_PER_REQUEST when post-filtering a text search).
 *
 *  - No text query  -> TMDB /discover with every filter applied server-side.
 *  - Text query     -> TMDB /search (supports year), then genre/season are
 *                      filtered on our side. To avoid near-empty pages we read
 *                      a few TMDB pages until we have enough matches.
 */
import tmdbClient from "../utils/api";
import { TtlCache } from "../utils/ttlCache";
import { MediaType } from "../Interfaces/media";
import { TmdbMovieListItem, TmdbShowListItem } from "../Interfaces/tmdb";
import { Season } from "../constants/types";
import { removeAnime } from "./tmdb";

export const SEASONS: Season[] = ["winter", "spring", "summer", "fall"];
export const isSeason = (v: unknown): v is Season =>
  typeof v === "string" && (SEASONS as string[]).includes(v);

/** TMDB never returns more than page 500. */
const TMDB_MAX_PAGE = 500;
/** Upper bound of TMDB requests one text search with filters may make. */
export const MAX_SEARCH_PAGES_PER_REQUEST = 3;
const PAGE_SIZE = 20;

export type SearchFilters = {
  query?: string;
  /**
   * TMDB page to start from (1-based). Use `nextPage` from the previous
   * response rather than page + 1: a filtered text search may read several
   * TMDB pages at once.
   */
  page: number;
  year?: number;
  season?: Season;
  /** comma separated TMDB genre ids, all must match */
  genres?: number[];
  includeAdult?: boolean;
  language?: string;
};

type ListItem = TmdbMovieListItem | TmdbShowListItem;

export type SearchPage = {
  results: ListItem[];
  /** the `page` that was requested */
  page: number;
  /** pass this as `page` to get the next results; null = no more */
  nextPage: number | null;
  totalPages: number;
  totalResults: number;
};

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

/** AniList-style seasons: Winter Jan–Mar, Spring Apr–Jun, Summer Jul–Sep, Fall Oct–Dec. */
export const seasonOfDate = (date: string): Season | null => {
  const d = new Date(date);
  if (!date || Number.isNaN(d.getTime())) return null;
  return SEASONS[Math.floor(d.getUTCMonth() / 3)];
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Inclusive date range of a season in a year, e.g. summer 2024 -> 2024-07-01..2024-09-30 */
export const seasonDateRange = (year: number, season: Season) => {
  const startMonth = SEASONS.indexOf(season) * 3 + 1; // 1,4,7,10
  const endMonth = startMonth + 2;
  const lastDay = new Date(Date.UTC(year, endMonth, 0)).getUTCDate();
  return {
    gte: `${year}-${pad(startMonth)}-01`,
    lte: `${year}-${pad(endMonth)}-${pad(lastDay)}`,
  };
};

const itemDate = (item: ListItem) =>
  "release_date" in item ? item.release_date : item.first_air_date;

/** Filters /discover can't express, or /search doesn't support at all. */
export const matchesFilters = (
  item: ListItem,
  { genres, season, year }: Pick<SearchFilters, "genres" | "season" | "year">
) => {
  if (genres?.length && !genres.every((g) => item.genre_ids?.includes(g))) return false;
  const date = itemDate(item);
  if (year && (!date || new Date(date).getUTCFullYear() !== year)) return false;
  if (season && seasonOfDate(date) !== season) return false;
  return true;
};

/** Params for TMDB /discover/{movie|tv} with every filter server-side. */
export const buildDiscoverParams = (mediaType: MediaType, f: SearchFilters) => {
  const dateField = mediaType === "movie" ? "primary_release_date" : "first_air_date";
  const params: Record<string, string | number | boolean> = {
    page: f.page,
    include_adult: !!f.includeAdult,
    sort_by: "popularity.desc",
  };
  if (f.language) params.with_original_language = f.language;
  if (f.genres?.length) params.with_genres = f.genres.join(",");
  if (f.year && f.season) {
    const { gte, lte } = seasonDateRange(f.year, f.season);
    params[`${dateField}.gte`] = gte;
    params[`${dateField}.lte`] = lte;
  } else if (f.year) {
    params[mediaType === "movie" ? "primary_release_year" : "first_air_date_year"] = f.year;
  }
  return params;
};

/** Params for TMDB /search/{movie|tv}. */
export const buildSearchParams = (mediaType: MediaType, f: SearchFilters, page: number) => {
  const params: Record<string, string | number | boolean> = {
    query: f.query ?? "",
    page,
    include_adult: !!f.includeAdult,
  };
  if (f.year) params[mediaType === "movie" ? "primary_release_year" : "first_air_date_year"] = f.year;
  return params;
};

/* ------------------------------------------------------------------ */
/* TMDB calls                                                          */
/* ------------------------------------------------------------------ */

type TmdbPage = { page: number; results: ListItem[]; total_pages: number; total_results: number };

// Debounced typing re-sends the same searches; cache pages for 5 minutes.
const pageCache = new TtlCache<TmdbPage>(5 * 60 * 1000, 500);

const getPage = (path: string, params: Record<string, string | number | boolean>) => {
  const key = `${path}?${Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&")}`;
  return pageCache.getOrLoad(key, async () => (await tmdbClient.get<TmdbPage>(path, { params })).data);
};

export const searchMediaPage = async (
  mediaType: MediaType,
  filters: SearchFilters
): Promise<SearchPage> => {
  const page = Math.min(Math.max(1, Math.floor(filters.page) || 1), TMDB_MAX_PAGE);
  const query = filters.query?.trim();

  // 1) No text: discover does all filtering (season needs a year to become a date range).
  if (!query) {
    const data = await getPage(`/discover/${mediaType}`, buildDiscoverParams(mediaType, { ...filters, page }));
    const needsSeasonFilter = !!filters.season && !filters.year;
    const results = removeAnime(data.results).filter(
      (r) => !needsSeasonFilter || seasonOfDate(itemDate(r)) === filters.season
    );
    const totalPages = Math.min(data.total_pages, TMDB_MAX_PAGE);
    return {
      results,
      page,
      nextPage: page < totalPages ? page + 1 : null,
      totalPages,
      totalResults: data.total_results,
    };
  }

  // 2) Text search: TMDB handles query + year. Genres/season are filtered here.
  const postFilter = !!filters.genres?.length || !!filters.season;
  if (!postFilter) {
    const data = await getPage(`/search/${mediaType}`, buildSearchParams(mediaType, filters, page));
    const totalPages = Math.min(data.total_pages, TMDB_MAX_PAGE);
    return {
      results: removeAnime(data.results),
      page,
      nextPage: page < totalPages ? page + 1 : null,
      totalPages,
      totalResults: data.total_results,
    };
  }

  // Read TMDB pages from `page` until we have a full page of matches,
  // the results run out, or we've used MAX_SEARCH_PAGES_PER_REQUEST requests.
  const results: ListItem[] = [];
  let totalPages = page;
  let p = page;
  for (let used = 0; used < MAX_SEARCH_PAGES_PER_REQUEST; used++, p++) {
    const data = await getPage(`/search/${mediaType}`, buildSearchParams(mediaType, filters, p));
    totalPages = Math.min(data.total_pages, TMDB_MAX_PAGE);
    results.push(...removeAnime(data.results).filter((r) => matchesFilters(r, filters)));
    if (results.length >= PAGE_SIZE || p >= totalPages) {
      p++;
      break;
    }
  }

  return {
    results,
    page,
    nextPage: p <= totalPages ? p : null,
    totalPages,
    // exact count is unknown after filtering
    totalResults: results.length,
  };
};
