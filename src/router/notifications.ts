import express from "express";

import { isAuthenticated } from "../middlewares";
import { getUserNotifsByType } from "../controllers/notifications";

export default (router: express.Router) => {
  router.get("/notifications/:type", isAuthenticated, getUserNotifsByType);
};
