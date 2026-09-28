/**
 * Pure stats engine. Give it a user's list entries, get back every stat.
 * No Mongo / Express in here, so it's easy to unit test.
 *
 * Definitions (same idea as AniList):
 *  - An entry "counts" unless its status is "planning".
 *  - Time watched = minutes of the episodes in `progress` + rewatches × full length.
 *  - Time planned = full length of "planning" entries.
 *  - Mean score = mean of the USER's scores; unscored (0 / null) entries are ignored.
 *  - Missing TMDB data never throws – it just falls back or skips that bucket.
 */
import { EntryData, ListStatus, MediaType, isListStatus, isMediaType } from "../Interfaces/media";
import {
  Distribution,
  MediaTypeStats,
  NumberDistribution,
  OtherStat,
  OtherStatType,
  OverviewStats,
  StatListItem,
  StatsInputEntry,
  UserStats,
} from "../Interfaces/stats";
import {
  DEFAULT_EPISODE_RUNTIME,
  DEFAULT_MOVIE_RUNTIME,
  clampProgress,
  dateOrNull,
  getTotalUnits,
  positiveOrNull,
} from "./entryData";

export const MAX_OTHER_STATS_PER_TYPE = 50;
export const MAX_LIST_ITEMS_PER_STAT = 30;

/* ------------------------------------------------------------------ */
/* Accumulators: keep sums, derive means at the end (no running-mean bugs) */
/* ------------------------------------------------------------------ */

type Bucket = { count: number; minutes: number; scoreSum: number; scored: number };

const newBucket = (): Bucket => ({ count: 0, minutes: 0, scoreSum: 0, scored: 0 });

const addTo = (bucket: Bucket, minutes: number, score: number | null) => {
  bucket.count += 1;
  bucket.minutes += minutes;
  if (score !== null) {
    bucket.scoreSum += score;
    bucket.scored += 1;
  }
};

const round = (n: number, digits = 2) => Number(n.toFixed(digits));
const meanOf = (b: Bucket) => (b.scored ? round(b.scoreSum / b.scored) : 0);
const hoursOf = (b: Bucket) => round(b.minutes / 60);

class DistributionBuilder {
  private buckets = new Map<string, Bucket>();

  add(key: string, minutes: number, score: number | null) {
    let b = this.buckets.get(key);
    if (!b) this.buckets.set(key, (b = newBucket()));
    addTo(b, minutes, score);
  }

  toDistribution(sort: "count" | "key" = "count"): Distribution[] {
    const rows = [...this.buckets.entries()].map(([format, b]) => ({
      format,
      count: b.count,
      hoursWatched: hoursOf(b),
      meanScore: meanOf(b),
    }));
    return sort === "key"
      ? rows.sort((a, b) => a.format.localeCompare(b.format))
      : rows.sort((a, b) => b.count - a.count || b.hoursWatched - a.hoursWatched);
  }

  toNumberDistribution(): NumberDistribution[] {
    return [...this.buckets.entries()]
      .map(([num, b]) => ({
        num: Number(num),
        count: b.count,
        hoursWatched: hoursOf(b),
        meanScore: meanOf(b),
      }))
      .sort((a, b) => a.num - b.num);
  }
}

type OtherBucket = Bucket & {
  title: string;
  profilePath: string | null;
  list: StatListItem[];
};

class OtherStatBuilder {
  private buckets = new Map<string, OtherBucket>();

  constructor(private mediaType: MediaType, private type: OtherStatType) {}

  add(
    item: { id: string; name: string; profile_path?: string | null },
    media: StatListItem,
    minutes: number,
    score: number | null
  ) {
    const key = String(item.id);
    let b = this.buckets.get(key);
    if (!b) {
      b = { ...newBucket(), title: item.name, profilePath: item.profile_path ?? null, list: [] };
      this.buckets.set(key, b);
    }
    addTo(b, minutes, score);
    if (b.list.length < MAX_LIST_ITEMS_PER_STAT) b.list.push(media);
  }

  build(): OtherStat[] {
    return [...this.buckets.entries()]
      .map(([statTypeId, b]) => ({
        mediaType: this.mediaType,
        type: this.type,
        statTypeId,
        title: b.title,
        profilePath: b.profilePath,
        count: b.count,
        meanScore: meanOf(b),
        timeWatched: hoursOf(b),
        list: b.list,
      }))
      .sort((a, b) => b.count - a.count || b.timeWatched - a.timeWatched)
      .slice(0, MAX_OTHER_STATS_PER_TYPE);
  }
}

/* ------------------------------------------------------------------ */
/* Per-entry maths                                                     */
/* ------------------------------------------------------------------ */

/** The user's score if they gave one, else null. */
export const userScore = (score: unknown): number | null => positiveOrNull(score);

/**
 * Minutes for the first `units` units of an entry.
 * Uses exact episode runtimes when stored, else runtime × units, else a default.
 */
export const minutesForUnits = (
  mediaType: MediaType,
  data: Partial<EntryData> | null | undefined,
  units: number
): number => {
  if (units <= 0) return 0;

  const perEpisode = data?.episode_runtimes;
  if (mediaType === "tv" && perEpisode && perEpisode.length > 0) {
    const exact = perEpisode.slice(0, units).reduce((a, b) => a + (positiveOrNull(b) ?? 0), 0);
    // If progress runs past the stored list, estimate the rest.
    const extra = Math.max(0, units - perEpisode.length);
    const fill = positiveOrNull(data?.runtime) ?? DEFAULT_EPISODE_RUNTIME;
    return exact + extra * fill;
  }

  const perUnit =
    positiveOrNull(data?.runtime) ??
    (mediaType === "movie" ? DEFAULT_MOVIE_RUNTIME : DEFAULT_EPISODE_RUNTIME);
  return perUnit * units;
};

export type EntryFigures = {
  status: ListStatus;
  counts: boolean;
  totalUnits: number | null;
  progress: number;
  unitsWatched: number;
  minutesWatched: number;
  minutesPlanned: number;
  score: number | null;
};

/** All the numbers for one entry, with every null/legacy case handled. */
export const entryFigures = (mediaType: MediaType, entry: StatsInputEntry): EntryFigures | null => {
  if (!isListStatus(entry.status)) return null;
  const status = entry.status;
  const data = entry.data ?? null;

  const totalUnits = getTotalUnits(mediaType, data);
  const rewatches = Math.max(0, Math.floor(Number(entry.rewatches) || 0));

  // Completed means "all of it", whatever progress says (old entries have progress 0).
  const progress =
    status === "completed" && totalUnits !== null
      ? totalUnits
      : clampProgress(entry.progress ?? 0, totalUnits);

  const fullMinutes = totalUnits !== null ? minutesForUnits(mediaType, data, totalUnits) : 0;
  const unitsWatched = progress + (totalUnits ?? 0) * rewatches;
  const minutesWatched = minutesForUnits(mediaType, data, progress) + fullMinutes * rewatches;

  return {
    status,
    counts: status !== "planning",
    totalUnits,
    progress,
    unitsWatched,
    minutesWatched: status === "planning" ? 0 : minutesWatched,
    minutesPlanned: status === "planning" ? fullMinutes : 0,
    score: userScore(entry.score),
  };
};

const yearOf = (date: string | null | undefined): string | null => {
  const d = dateOrNull(date);
  return d ? String(new Date(d).getFullYear()) : null;
};

/* ------------------------------------------------------------------ */
/* Main entry point                                                    */
/* ------------------------------------------------------------------ */

const OTHER_TYPES: OtherStatType[] = ["genre", "tag", "studio", "cast", "crew"];

const computeForMediaType = (mediaType: MediaType, entries: StatsInputEntry[]): MediaTypeStats => {
  const total = newBucket();
  let episodesWatched = 0;
  let minutesPlanned = 0;
  const scores: number[] = [];

  const statusDist = new DistributionBuilder();
  const countryDist = new DistributionBuilder();
  const releaseYear = new DistributionBuilder();
  const watchYear = new DistributionBuilder();
  const scoreDist = new DistributionBuilder();
  const epsCount = new DistributionBuilder();

  const other = Object.fromEntries(
    OTHER_TYPES.map((t) => [t, new OtherStatBuilder(mediaType, t)])
  ) as Record<OtherStatType, OtherStatBuilder>;

  for (const entry of entries) {
    const f = entryFigures(mediaType, entry);
    if (!f) continue; // unknown status – ignore rather than crash

    const data = entry.data ?? null;

    // Status distribution includes planning (hours = planned hours, like before).
    statusDist.add(f.status, f.counts ? f.minutesWatched : f.minutesPlanned, f.score);

    if (!f.counts) {
      minutesPlanned += f.minutesPlanned;
      continue;
    }

    addTo(total, f.minutesWatched, f.score);
    if (f.score !== null) {
      scores.push(f.score);
      scoreDist.add(String(Math.round(f.score)), f.minutesWatched, f.score);
    }
    if (mediaType === "tv") {
      episodesWatched += f.unitsWatched;
      if (f.totalUnits !== null) epsCount.add(String(f.totalUnits), f.minutesWatched, f.score);
    }

    for (const country of data?.origin_country ?? []) {
      if (country) countryDist.add(country, f.minutesWatched, f.score);
    }

    const released = yearOf(data?.release_date);
    if (released) releaseYear.add(released, f.minutesWatched, f.score);

    // Watch year: when they finished it, or started it if still going.
    const watched = yearOf(f.status === "completed" ? entry.endDate : entry.startDate);
    if (watched) watchYear.add(watched, f.minutesWatched, f.score);

    const listItem: StatListItem = {
      id: entry.mediaid,
      title: entry.title,
      posterPath: entry.poster ?? null,
      mediaType,
    };
    const add = (type: OtherStatType, items: { id: string; name: string; profile_path?: string | null }[] | undefined) => {
      // de-dupe per entry so one person with 2 jobs counts once
      const seen = new Set<string>();
      for (const item of items ?? []) {
        if (!item?.id || !item.name || seen.has(String(item.id))) continue;
        seen.add(String(item.id));
        other[type].add(item, listItem, f.minutesWatched, f.score);
      }
    };
    add("genre", data?.genres);
    add("tag", data?.tags);
    add("studio", data?.production_companies);
    add("cast", data?.cast);
    add("crew", data?.crew);
  }

  const mean = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const variance = scores.length
    ? scores.reduce((acc, s) => acc + (s - mean) ** 2, 0) / scores.length
    : 0;

  const overview: OverviewStats = {
    mediaType,
    count: total.count,
    episodesWatched,
    daysWatched: round(total.minutes / 60 / 24),
    daysPlanned: round(minutesPlanned / 60 / 24),
    meanScore: round(mean),
    standardDeviation: round(Math.sqrt(variance)),
    score: scoreDist.toNumberDistribution(),
    epsCount: epsCount.toNumberDistribution(),
    formatDist: [],
    statusDist: statusDist.toDistribution(),
    countryDist: countryDist.toDistribution(),
    releaseYear: releaseYear.toDistribution("key"),
    watchYear: watchYear.toDistribution("key"),
  };

  return {
    overview,
    other: OTHER_TYPES.flatMap((t) => other[t].build()),
  };
};

export const computeUserStats = (entries: StatsInputEntry[]): UserStats => {
  const byType: Record<MediaType, StatsInputEntry[]> = { movie: [], tv: [] };
  for (const entry of entries) {
    if (isMediaType(entry.mediaType)) byType[entry.mediaType].push(entry);
  }
  return {
    movie: computeForMediaType("movie", byType.movie),
    tv: computeForMediaType("tv", byType.tv),
  };
};
