import { ListStatus, MediaType, StoredEntryData } from "./media";

/** What the stats engine needs from a list entry (a subset of the Mongo doc). */
export type StatsInputEntry = {
  mediaType: string; // validated inside the engine
  mediaid: string;
  status: string;
  progress?: number | null;
  rewatches?: number | null;
  /** The USER's score. 0 / null = not scored. */
  score?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  title: string;
  poster?: string | null;
  data?: StoredEntryData;
};

/** One bucket of a distribution chart (status, country, release year, ...). */
export type Distribution = {
  format: string;
  count: number;
  hoursWatched: number;
  meanScore: number;
};

/** One bucket of a numeric distribution (score, episode count). */
export type NumberDistribution = {
  num: number;
  count: number;
  hoursWatched: number;
  meanScore: number;
};

export type OverviewStats = {
  mediaType: MediaType;
  /** Entries that aren't "planning" */
  count: number;
  episodesWatched: number;
  daysWatched: number;
  daysPlanned: number;
  /** Mean of the user's own scores (unscored entries ignored). 0 if nothing scored. */
  meanScore: number;
  /** Standard deviation of the user's scores. */
  standardDeviation: number;
  score: NumberDistribution[];
  epsCount: NumberDistribution[];
  formatDist: Distribution[];
  statusDist: Distribution[];
  countryDist: Distribution[];
  releaseYear: Distribution[];
  watchYear: Distribution[];
};

export const OTHER_STAT_TYPES = ["genre", "tag", "studio", "cast", "crew"] as const;
export type OtherStatType = (typeof OTHER_STAT_TYPES)[number];

export type StatListItem = {
  id: string;
  title: string;
  posterPath: string | null;
  mediaType: MediaType;
};

export type OtherStat = {
  mediaType: MediaType;
  type: OtherStatType;
  statTypeId: string;
  title: string;
  profilePath: string | null;
  count: number;
  meanScore: number;
  /** hours */
  timeWatched: number;
  list: StatListItem[];
};

export type MediaTypeStats = {
  overview: OverviewStats;
  other: OtherStat[];
};

export type UserStats = Record<MediaType, MediaTypeStats>;

export type { ListStatus };
