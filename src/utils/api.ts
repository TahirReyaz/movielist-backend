import axios, { AxiosRequestConfig } from "axios";

import {
  TMDB_API_KEY,
  TMDB_ENDPOINT,
  TMDB_MAX_CONCURRENT,
  TMDB_MIN_INTERVAL_MS,
} from "../constants/misc";
import { createLimiter, withRetry } from "./rateLimit";

const client = axios.create({
  baseURL: TMDB_ENDPOINT,
  timeout: 10_000,
  params: {
    api_key: TMDB_API_KEY,
  },
});

/** Shared by every TMDB call in this process. */
export const tmdbLimiter = createLimiter({
  maxConcurrent: TMDB_MAX_CONCURRENT,
  minIntervalMs: TMDB_MIN_INTERVAL_MS,
});

// Annotated so it stays typed even without `strictBindCallApply`.
const rawGet: typeof client.get = client.get.bind(client);

/**
 * Every `tmdbClient.get(...)` in the app now goes through the limiter
 * and retries 429 / 5xx with backoff. Callers don't need to change.
 */
client.get = ((url: string, config?: AxiosRequestConfig) =>
  tmdbLimiter.run(() => withRetry(() => rawGet(url, config)))) as typeof client.get;

export default client;
