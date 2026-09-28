import dotenv from "dotenv";

import { ListStatus, MEDIA_TYPES } from "../Interfaces/media";
import { OTHER_STAT_TYPES } from "../Interfaces/stats";

dotenv.config();

export const detailTranslation: any = {
  characters: "credits",
  tags: "keywords",
  recommendations: "similar",
};

export const TMDB_ENDPOINT = process.env.TMDB_ENDPOINT;
export const TMDB_API_KEY = process.env.TMDB_API_KEY;
export const FRONTEND_DOMAIN = process.env.FRONTEND_DOMAIN;

const numEnv = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/* ---- TMDB rate limiting (per server instance) ---- */
export const TMDB_MAX_CONCURRENT = numEnv("TMDB_MAX_CONCURRENT", 8);
/** 30ms between request starts => at most ~33 req/s (TMDB allows ~50) */
export const TMDB_MIN_INTERVAL_MS = numEnv("TMDB_MIN_INTERVAL_MS", 30);

/* ---- Entry data refresh ---- */
/** Bump this whenever EntryData's shape changes: every entry gets re-fetched. */
export const ENTRY_DATA_VERSION = 2;
/** Re-fetch entry data older than this (new episodes, fixed runtimes, ...). */
export const ENTRY_DATA_STALE_DAYS = numEnv("ENTRY_DATA_STALE_DAYS", 14);
/** After a failed TMDB fetch, wait this long before trying that entry again. */
export const ENTRY_DATA_RETRY_HOURS = numEnv("ENTRY_DATA_RETRY_HOURS", 24);

/* ---- Cron jobs ---- */
/** Shared secret for cron endpoints. Send as `x-cron-secret` header or `?secret=`. */
export const CRON_SECRET = process.env.CRON_SECRET;
/** Free cron services usually time out at ~30s, Vercel at maxDuration (60s). */
export const CRON_TIME_BUDGET_MS = numEnv("CRON_TIME_BUDGET_SECONDS", 25) * 1000;
export const DEFAULT_AVATAR_URL =
  "https://firebasestorage.googleapis.com/v0/b/movie-list-3532f.appspot.com/o/user-avatar%2FuserAvatar.png?alt=media";
export const DEFAULT_ENTRY_BANNER_URL =
  "https://firebasestorage.googleapis.com/v0/b/movie-list-3532f.appspot.com/o/placeholders%2Fentry-banner-placeholder.jpg?alt=media&token=8ab96f18-9465-49a3-8448-c4f15561b001";

export const notificationTypes = [
  "airing",
  "activity",
  "forum",
  "follows",
  "media",
];

export const MediaStatus = {
  completed: "completed",
  watching: "watching",
  rewatching: "rewatching",
  paused: "paused",
  dropped: "dropped", // was "droppe" – dropped entries never matched
  planning: "planning",
} as const satisfies Record<ListStatus, ListStatus>;

export const MediaType = {
  tv: "tv",
  movie: "movie",
  show: "tv",
} as const;

export const mediaTypeEnum: string[] = [...MEDIA_TYPES];
export const statTypeEnum: string[] = [...OTHER_STAT_TYPES];
