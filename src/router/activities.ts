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
  getActivityHistory,
  getActivitiesByMediaid,
} from "../controllers/activities";

export default (router: express.Router) => {
  router.get("/activities", getAllActivities);
  router.get("/activities/user/:username", getActivitiesByUsername);
  router.get("/activities/history/:username", getActivityHistory);
  router.get("/activities/following", isAuthenticated, getFollowingActivities);
  router.get("/activities/media/:mediaid", getActivitiesByMediaid);
  router.post("/activity", isAuthenticated, createActivityController);
  router.delete(
    "/activity/:id",
    isAuthenticated,
    isOwnActivity,
    deleteActivity
  );
  router.get("/activity/:id", getActivityController);
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
