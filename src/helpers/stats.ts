import express from "express";
import { Document } from "mongoose";

import { ListEntry } from "../db/listEntries";
import { CRON_TIME_BUDGET_MS } from "../constants/misc";
import { refreshStaleEntries } from "./entryRefresh";
import { deadlineIn } from "../utils/budget";

export interface EntryDocument extends ListEntry, Document {}

export { computeUserStats, entryFigures, minutesForUnits } from "./statsEngine";

export const calculateWeightedScore = (
  voteAverage: number,
  voteCount: number,
  globalAverage = 7,
  m = 500
): number => {
  const weightedScore =
    (voteAverage * voteCount + globalAverage * m) / (voteCount + m);
  return parseFloat(weightedScore.toFixed(2));
};

/**
 * Refreshes the TMDB snapshot of one user's stale entries (legacy shape,
 * old version, or older than ENTRY_DATA_STALE_DAYS). Up-to-date entries
 * are skipped, and TMDB calls are rate limited + de-duplicated.
 *
 * Stops after ~25s; if `remaining` > 0 in the response, call it again.
 */
export const transformEntries = async (
  req: express.Request,
  res: express.Response
) => {
  const { id } = req.params;
  try {
    const result = await refreshStaleEntries({
      owner: id,
      limit: 200,
      deadline: deadlineIn(CRON_TIME_BUDGET_MS),
    });
    return res.status(200).send({
      message: result.remaining > 0 ? "Partially transformed, call again" : "Transformed",
      ...result,
    });
  } catch (error) {
    console.error("Failed to transform entries:", error);
    return res.status(500).send({ message: "Failed to transform entries" });
  }
};
