import tmdbClient from "../utils/api";
import {
  TmdbMovieDetailWithExtras,
  TmdbSeasonDetailWithExtras,
  TmdbShowDetailWithExtras,
} from "../Interfaces/tmdb";
import { EntryData, MediaType, parseMediaId } from "../Interfaces/media";
import { movieToEntryData, seasonTitle, seasonToEntryData } from "./entryData";
import { TtlCache } from "../utils/ttlCache";

// A show is shared by all its seasons: fetch it once per hour, not once per season.
const showCache = new TtlCache<TmdbShowDetailWithExtras>(60 * 60 * 1000, 300);
// Normalised movie/season results: many users add the same popular titles.
const mediaCache = new TtlCache<FetchedEntryMedia | null>(10 * 60 * 1000, 1000);

const getShow = (showId: string) =>
  showCache.getOrLoad(showId, async () => {
    const { data } = await tmdbClient.get<TmdbShowDetailWithExtras>(`tv/${showId}`, {
      params: { append_to_response: "keywords" },
    });
    return data;
  });

export const translateBulkType = {
  trending: "popular",
  top: "top_rated",
  airing_today: "airing_today",
  on_the_air: "on_the_air",
  upcoming: "upcoming",
  now_playing: "now_playing",
  popular: "popular",
  top_rated: "top_rated",
};

export type FetchedEntryMedia = {
  data: EntryData;
  /** Title to store on the entry. Seasons get "Show - Season N". */
  title: string;
  poster: string | null;
  backdrop: string | null;
};

/**
 * Fetches a trackable media item (movie or season) from TMDB and normalises it.
 * Returns null if TMDB fails or the id points to something untrackable (a whole show).
 */
export const fetchEntryMedia = (
  mediaType: MediaType,
  mediaid: string
): Promise<FetchedEntryMedia | null> =>
  mediaCache
    .getOrLoad(`${mediaType}:${mediaid}`, () => loadEntryMedia(mediaType, mediaid))
    .catch((error): null => {
      console.error("fetchEntryMedia failed", { mediaType, mediaid }, error?.message ?? error);
      return null;
    });

/** Uncached loader. Throws on TMDB errors so failures aren't cached. */
async function loadEntryMedia(
  mediaType: MediaType,
  mediaid: string
): Promise<FetchedEntryMedia | null> {
  const parsed = parseMediaId(mediaType, mediaid);

  if (parsed.kind === "movie") {
    const { data: movie } = await tmdbClient.get<TmdbMovieDetailWithExtras>(
      `movie/${parsed.movieId}`,
      { params: { append_to_response: "keywords,credits" } }
    );
    return {
      data: movieToEntryData(movie),
      title: movie.title,
      poster: movie.poster_path,
      backdrop: movie.backdrop_path,
    };
  }

  if (parsed.kind === "season") {
    const [show, { data: season }] = await Promise.all([
      getShow(parsed.showId),
      tmdbClient.get<TmdbSeasonDetailWithExtras>(
        `tv/${parsed.showId}/season/${parsed.seasonNumber}`,
        { params: { append_to_response: "credits" } }
      ),
    ]);
    return {
      data: seasonToEntryData(show, season),
      title: seasonTitle(show, season),
      poster: season.poster_path ?? show.poster_path,
      backdrop: show.backdrop_path,
    };
  }

  // A whole show can't be added to a list – only its seasons.
  return null;
}

/** Kept for existing callers: returns only the normalised EntryData. */
export const fetchMediaData = async (
  mediaType: MediaType,
  mediaid: string
): Promise<EntryData | null> => (await fetchEntryMedia(mediaType, mediaid))?.data ?? null;

export const removeAnime = <T extends { genre_ids?: number[]; original_language?: string }>(
  results: T[] = []
): T[] =>
  results.filter(
    (result) => !(result.genre_ids?.includes(16) && result.original_language === "ja")
  );
