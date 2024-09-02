import express from "express";

import {
  isAuthenticated,
  isOwnActivity,
  paramActivityExists,
} from "../middlewares";
import {
  commentOnActivity,
  createActivityController,
  deleteActivity,
  getActivitiesByUsername,
  getActivityComments,
  getActivityController,
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
  router.delete("/activity/:id", isAuthenticated, deleteActivity);
  router.get("/activity/:id", getActivityController);
  router.patch(
    "/activity/like/:activityId",
    isAuthenticated,
    isOwnActivity,
    likeActivity
  );
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
