import express from "express";

import { isAuthenticated } from "../middlewares";
import {
  getActivitiesByUsername,
  getAllActivities,
} from "../controllers/activities";

export default (router: express.Router) => {
  router.get("/activities", getAllActivities);
  router.get("/activities/user/:username", getActivitiesByUsername);
};
