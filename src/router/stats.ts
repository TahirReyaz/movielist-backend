import express from "express";

import {
  isAuthenticated,
  isCronAuthorized,
  isUserExists,
} from "../middlewares";
import {
  generateAllUserStats,
  getOtherStats,
  getOverviewStats,
  updateStats,
} from "../controllers/stats";

export default (router: express.Router) => {
  router.get(
    "/stats/overview/:username/:mediaType",
    isUserExists,
    getOverviewStats
  );
  router.get(
    "/stats/other/:statType/:username/:mediaType",
    isUserExists,
    getOtherStats
  );
  // cron: send the secret as `x-cron-secret` header or `?secret=`
  router.patch("/stats/update-all", isCronAuthorized, generateAllUserStats);
  router.patch("/stats/update", isAuthenticated, updateStats);
};
