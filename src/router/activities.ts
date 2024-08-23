import express from "express";

import { isAuthenticated } from "../middlewares";
import {
  getActivitiesByUsername,
  getAllActivities,
  getFollowingActivities,
  likeActivity,
  unlikeActivity,
} from "../controllers/activities";

export default (router: express.Router) => {
  router.get("/activities", getAllActivities);
  router.get("/activities/user/:username", getActivitiesByUsername);
  router.get("/activities/following", isAuthenticated, getFollowingActivities);
  router.patch("/activity/like/:activityId", isAuthenticated, likeActivity);
  router.patch("/activity/unlike/:activityId", isAuthenticated, unlikeActivity);
};
