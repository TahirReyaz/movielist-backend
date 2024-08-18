import express from "express";

import { isAuthenticated } from "../middlewares";
import { getAllActivities } from "../controllers/activities";

export default (router: express.Router) => {
  router.get("/activities", isAuthenticated, getAllActivities);
  router.get("/actvities/:id", getAllActivities);
};
