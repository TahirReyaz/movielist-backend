import express from "express";

import { isCronAuthorized } from "../middlewares";
import {
  refreshStaleEntriesController,
  runCron,
} from "../controllers/maintenance";

/** Endpoints meant for cron jobs. All need the cron secret (see isCronAuthorized). */
export default (router: express.Router) => {
  router.patch("/cron/run", isCronAuthorized, runCron);
  router.get("/cron/run", isCronAuthorized, runCron); // some free cron services only do GET
  router.patch("/entries/refresh-stale", isCronAuthorized, refreshStaleEntriesController);
};
