import express from "express";

import { isAuthenticated, paramActivityExists } from "../middlewares";
import {
  commentOnActivity,
  createActivityController,
  getActivitiesByUsername,
  getActivityComments,
  getAllActivities,
  getFollowingActivities,
  likeActivity,
  unlikeActivity,
} from "../controllers/activities";

export default (router: express.Router) => {
  router.get("/activities", getAllActivities);
  router.get("/activities/user/:username", getActivitiesByUsername);
  router.get("/activities/following", isAuthenticated, getFollowingActivities);
  router.post("/activity", isAuthenticated, createActivityController);
  router.patch("/activity/like/:activityId", isAuthenticated, likeActivity);
  router.patch("/activity/unlike/:activityId", isAuthenticated, unlikeActivity);
  router.post(
    "/activity/comment/:activityId",
    isAuthenticated,
    paramActivityExists,
    commentOnActivity
  );
  router.get(
    "/activity/comments/:activityId",
    paramActivityExists,
    getActivityComments
  );
};
