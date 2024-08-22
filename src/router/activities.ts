import express from "express";

import { isAuthenticated } from "../middlewares";
import {
  getActivitiesByUsername,
  getAllActivities,
  getFollowingActivities,
} from "../controllers/activities";

export default (router: express.Router) => {
  router.get("/activities", getAllActivities);
  router.get("/activities/user/:username", getActivitiesByUsername);
  router.get("/activities/following", isAuthenticated, getFollowingActivities);
};
