/**
 * Keeping list entries' TMDB snapshot (`entry.data`) fresh without
 * hammering TMDB.
 *
 *  - Every entry records `dataVersion` + `dataUpdatedAt`.
 *  - An entry is "stale" if its version is old, it was never refreshed,
 *    or its data is older than ENTRY_DATA_STALE_DAYS.
 *  - The batch job groups stale entries by media, so a movie that is in
 *    500 users' lists costs ONE TMDB fetch and ONE updateMany.
 *  - It works through the oldest media first and stops at a time budget,
 *    so calling it repeatedly (cron) eventually refreshes everything.
 */
import mongoose from "mongoose";

import { ListEntryModel } from "../db/listEntries";
import { markStatsDirty } from "../db/users";
import {
  ENTRY_DATA_RETRY_HOURS,
  ENTRY_DATA_STALE_DAYS,
  ENTRY_DATA_VERSION,
} from "../constants/misc";
import { isMediaType } from "../Interfaces/media";
import { fetchEntryMedia, FetchedEntryMedia } from "./tmdb";
import { getTotalUnits } from "./entryData";
import { processWithinBudget } from "../utils/budget";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** Mongo filter for entries whose data should be re-fetched. */
export const staleEntryFilter = (now = Date.now()) => ({
  $and: [
    {
      $or: [
        { dataVersion: { $ne: ENTRY_DATA_VERSION } },
        { dataUpdatedAt: { $exists: false } },
        { dataUpdatedAt: null },
        { dataUpdatedAt: { $lt: new Date(now - ENTRY_DATA_STALE_DAYS * DAY_MS) } },
      ],
    },
    {
      // skip entries that failed recently
      $or: [
        { dataFailedAt: { $exists: false } },
        { dataFailedAt: null },
        { dataFailedAt: { $lt: new Date(now - ENTRY_DATA_RETRY_HOURS * HOUR_MS) } },
      ],
    },
  ],
});

type RefreshableEntry = {
  dataVersion?: number | null;
  dataUpdatedAt?: Date | null;
};

/** Should this single entry be re-fetched before we use its data? */
export const needsRefresh = (
  entry: RefreshableEntry,
  maxAgeMs = ENTRY_DATA_STALE_DAYS * DAY_MS,
  now = Date.now()
) =>
  entry.dataVersion !== ENTRY_DATA_VERSION ||
  !entry.dataUpdatedAt ||
  now - new Date(entry.dataUpdatedAt).getTime() > maxAgeMs;

/** Fields to $set on an entry after a successful fetch. */
export const freshDataFields = (mediaType: string, fetched: FetchedEntryMedia) => ({
  data: fetched.data,
  dataVersion: ENTRY_DATA_VERSION,
  dataUpdatedAt: new Date(),
  dataFailedAt: null as Date | null,
  // seasons get a server-built "Show - Season N" title
  ...(mediaType === "tv" ? { title: fetched.title } : {}),
});

/* ------------------------------------------------------------------ */
/* One media item -> all entries that point at it                     */
/* ------------------------------------------------------------------ */

type MediaRefreshResult = {
  mediaType: string;
  mediaid: string;
  ok: boolean;
  entriesUpdated: number;
};

const refreshMedia = async (
  mediaType: string,
  mediaid: string
): Promise<MediaRefreshResult> => {
  const filter = { mediaType, mediaid };
  const fetched = isMediaType(mediaType)
    ? await fetchEntryMedia(mediaType, mediaid)
    : null;

  if (!fetched) {
    await ListEntryModel.updateMany(filter, { $set: { dataFailedAt: new Date() } });
    return { mediaType, mediaid, ok: false, entriesUpdated: 0 };
  }

  const owners: mongoose.Types.ObjectId[] = await ListEntryModel.distinct("owner", filter);

  const result = await ListEntryModel.updateMany(filter, {
    $set: freshDataFields(mediaType, fetched),
  });

  // Completed entries should always show full progress (new episodes may have been added).
  const total = getTotalUnits(mediaType, fetched.data);
  if (total !== null) {
    await ListEntryModel.updateMany(
      { ...filter, status: "completed" },
      { $set: { progress: total } }
    );
  }

  await markStatsDirty(owners);

  return { mediaType, mediaid, ok: true, entriesUpdated: result.modifiedCount ?? 0 };
};

/* ------------------------------------------------------------------ */
/* Batch job                                                           */
/* ------------------------------------------------------------------ */

export type RefreshBatchResult = {
  mediaRefreshed: number;
  mediaFailed: number;
  entriesUpdated: number;
  /** Stale media items still left after this run (0 = all done). */
  remaining: number;
  stoppedEarly: boolean;
  failed: { mediaType: string; mediaid: string }[];
};

const groupStage = { $group: { _id: { mediaType: "$mediaType", mediaid: "$mediaid" }, oldest: { $min: "$dataUpdatedAt" } } };

/**
 * Refresh up to `limit` stale media items (oldest first) before `deadline`.
 * Pass `owner` to only look at one user's entries (other users' entries for
 * the same media are refreshed too, for free).
 */
export const refreshStaleEntries = async ({
  limit = 100,
  deadline,
  owner,
  concurrency = 4,
}: {
  limit?: number;
  deadline: number;
  owner?: string | mongoose.Types.ObjectId;
  concurrency?: number;
}): Promise<RefreshBatchResult> => {
  const match = owner
    ? { $and: [staleEntryFilter(), { owner: new mongoose.Types.ObjectId(String(owner)) }] }
    : staleEntryFilter();

  const groups: { _id: { mediaType: string; mediaid: string } }[] =
    await ListEntryModel.aggregate([
      { $match: match },
      groupStage,
      { $sort: { oldest: 1 } },
      { $limit: limit },
    ]);

  const { results, stoppedEarly } = await processWithinBudget(
    groups,
    (g) =>
      refreshMedia(g._id.mediaType, g._id.mediaid).catch((error) => {
        console.error("refreshMedia failed", g._id, error);
        return { ...g._id, ok: false, entriesUpdated: 0 };
      }),
    { concurrency, deadline }
  );

  const [left] = await ListEntryModel.aggregate([
    { $match: match },
    groupStage,
    { $count: "n" },
  ]);

  const failed = results.filter((r) => !r.ok);
  return {
    mediaRefreshed: results.length - failed.length,
    mediaFailed: failed.length,
    entriesUpdated: results.reduce((sum, r) => sum + r.entriesUpdated, 0),
    remaining: left?.n ?? 0,
    stoppedEarly,
    failed: failed.map(({ mediaType, mediaid }) => ({ mediaType, mediaid })),
  };
};
