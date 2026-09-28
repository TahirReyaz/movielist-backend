import mongoose from "mongoose";
import express from "express";
import lodash from "lodash";

import {
  UserModel,
  getUserById,
  getUserByUsername,
  markStatsDirty,
  updateUserById,
} from "../db/users";
import { CRON_TIME_BUDGET_MS } from "../constants/misc";
import { deadlineIn, processWithinBudget } from "../utils/budget";
import { getEntries } from "../db/listEntries";
import { computeUserStats } from "../helpers/statsEngine";
import {
  getOverviewStatsByUseridAndMediaType,
  replaceOverviewStats,
} from "../db/overviewStats";
import {
  deleteOtherStatsByUserid,
  getOtherStatsFromDB,
  insertOtherStats,
} from "../db/otherStats";
import { isMediaType } from "../Interfaces/media";
import { OTHER_STAT_TYPES, OtherStatType, StatsInputEntry } from "../Interfaces/stats";

const isOtherStatType = (v: unknown): v is OtherStatType =>
  typeof v === "string" && (OTHER_STAT_TYPES as readonly string[]).includes(v);

export const getOverviewStats = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { mediaType } = req.params;

    // `isUserExists` puts the profile owner (from :username) on req.identity
    const userid = lodash.get(req, "identity._id") as string;

    if (!isMediaType(mediaType)) {
      return res.status(403).send("Wrong Media Type");
    }

    const stats = await getOverviewStatsByUseridAndMediaType(userid, mediaType);

    return res.status(200).json(stats);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Some error occurred" });
  }
};

export const getOtherStats = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const { username, mediaType, statType } = req.params;

    if (!username || !isMediaType(mediaType) || !isOtherStatType(statType)) {
      return res.status(403).send("Wrong Media or Stat Type or Missing User");
    }

    const user = await getUserByUsername(username);
    if (!user) {
      return res.status(404).send("User not found");
    }

    const stats = await getOtherStatsFromDB(
      user._id.toString(),
      mediaType,
      statType
    );

    return res.status(200).json(stats);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Some error occurred" });
  }
};

export const updateStats = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userid = lodash.get(req, "identity._id") as mongoose.Types.ObjectId;

    await generateUserStats(userid.toString());

    return res.status(200).send({ message: "Generated user stats" });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Some error occurred" });
  }
};

/** Recompute and store all stats for one user. Throws on failure. */
export const generateUserStats = async (userId: string) => {
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");

  // Clear the flag BEFORE reading entries: if an entry changes while we
  // compute, it sets the flag again and the next cron run picks it up.
  await updateUserById(userId, { statsDirty: false });

  try {
    const entries = await getEntries({ owner: userId }).lean();
    const stats = computeUserStats(entries as unknown as StatsInputEntry[]);

    await deleteOtherStatsByUserid(userId);
    await insertOtherStats(userId, [...stats.movie.other, ...stats.tv.other]);

    await Promise.all([
      replaceOverviewStats(userId, stats.movie.overview),
      replaceOverviewStats(userId, stats.tv.overview),
    ]);

    await updateUserById(userId, { statsGeneratedAt: new Date() });
    return stats;
  } catch (error) {
    await markStatsDirty([userId]);
    throw error;
  }
};

export type StatsBatchResult = {
  generated: number;
  failed: string[];
  /** users still waiting (dirty) after this run */
  remaining: number;
  stoppedEarly: boolean;
};

/**
 * Regenerate stats for users whose entries changed (or every user when
 * `all`), oldest first, until `deadline`. No TMDB calls – only Mongo.
 */
export const generateStatsBatch = async ({
  deadline,
  all = false,
  limit = 500,
}: {
  deadline: number;
  all?: boolean;
  limit?: number;
}): Promise<StatsBatchResult> => {
  const filter = all ? {} : { statsDirty: { $ne: false } };
  const users = await UserModel.find(filter, { _id: 1 })
    .sort({ statsGeneratedAt: 1 })
    .limit(limit)
    .lean();

  const failed: string[] = [];
  const { processed, stoppedEarly } = await processWithinBudget(
    users,
    async (user: { _id: mongoose.Types.ObjectId }) => {
      const id = user._id.toString();
      try {
        await generateUserStats(id);
      } catch (error) {
        console.error("Error generating stats for", id, error);
        failed.push(id);
      }
    },
    { concurrency: 2, deadline }
  );

  const remaining = await UserModel.countDocuments({ statsDirty: { $ne: false } });
  return { generated: processed - failed.length, failed, remaining, stoppedEarly };
};

/**
 * Cron: PATCH /stats/update-all  (needs the cron secret)
 * `?all=true` regenerates everyone (oldest first) instead of only changed users.
 */
export const generateAllUserStats = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const result = await generateStatsBatch({
      deadline: deadlineIn(CRON_TIME_BUDGET_MS),
      all: req.query.all === "true",
    });
    return res.status(200).send({ message: "Generated", ...result });
  } catch (error) {
    console.error("Error generating stats for all users:", error);
    return res.status(500).send({ message: "Error occurred. Check console" });
  }
};
