import express from "express";

import { isAuthenticated } from "../middlewares";
import {
  generateAllUserStats,
  getOtherStats,
  getOverviewStats,
  updateStats,
} from "../controllers/stats";

export default (router: express.Router) => {
  router.get("/stats/overview/:userid/:mediaType", getOverviewStats);
  router.get("/stats/other/:statType/:userid/:mediaType", getOtherStats);
  router.patch("/stats/update-all", generateAllUserStats);
  router.patch("/stats/update", isAuthenticated, updateStats);
};
