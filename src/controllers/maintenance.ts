import express from "express";

import { CRON_TIME_BUDGET_MS } from "../constants/misc";
import { refreshStaleEntries } from "../helpers/entryRefresh";
import { generateStatsBatch } from "./stats";
import { deadlineIn } from "../utils/budget";

const intQuery = (value: unknown, fallback: number, max: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max) : fallback;
};

/**
 * PATCH /entries/refresh-stale?limit=100
 * Re-fetches TMDB data for stale entries of ALL users (oldest first,
 * one fetch per movie/season, rate limited). Call repeatedly until
 * `remaining` is 0 – each call stops before the time budget.
 */
export const refreshStaleEntriesController = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const result = await refreshStaleEntries({
      limit: intQuery(req.query.limit, 100, 1000),
      deadline: deadlineIn(CRON_TIME_BUDGET_MS),
    });
    return res.status(200).send(result);
  } catch (error) {
    console.error("refresh-stale failed", error);
    return res.status(500).send({ message: "Refresh failed. Check logs" });
  }
};

/**
 * PATCH /cron/run  – the one URL to point a free cron job at.
 *  1. refresh stale entry data   (~60% of the time budget, uses TMDB)
 *  2. regenerate stats of users whose entries changed (rest, Mongo only)
 * Safe to call as often as every few minutes: when nothing is stale or
 * dirty it does almost no work.
 */
export const runCron = async (req: express.Request, res: express.Response) => {
  const start = Date.now();
  try {
    const refresh = await refreshStaleEntries({
      limit: intQuery(req.query.limit, 100, 1000),
      deadline: start + CRON_TIME_BUDGET_MS * 0.6,
    });
    const stats = await generateStatsBatch({
      deadline: Math.max(start + CRON_TIME_BUDGET_MS, Date.now() + 2_000),
    });
    return res
      .status(200)
      .send({ tookMs: Date.now() - start, refresh, stats });
  } catch (error) {
    console.error("cron run failed", error);
    return res.status(500).send({ message: "Cron run failed. Check logs" });
  }
};
