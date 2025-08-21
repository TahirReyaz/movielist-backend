import express from "express";

import { isAuthenticated, isUserExists } from "../middlewares";
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
  router.patch("/stats/update-all", generateAllUserStats);
  router.patch("/stats/update", isAuthenticated, updateStats);
};
